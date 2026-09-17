// integrations/telegram_manager.js — Real Telegram Client & MTProto Integration
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

// In-memory authentication state per user (for multi-step OTP & 2FA login)
const pendingAuthSessions = new Map();

function getApiHash() {
  const raw = String(process.env.TELEGRAM_API_HASH || '').trim();
  if (!raw) return 'eb1d083ea140e72c04670582178fd5af';
  if (raw.toLowerCase().startsWith('ebl')) return raw.replace(/^ebl/i, 'eb1');
  return raw;
}

function getTelegramConfig(db, uid) {
  const row = db.prepare("SELECT * FROM integrations WHERE user_id = ? AND provider = 'TELEGRAM'").get(uid);
  let config = {};
  if (row && row.config_json) {
    try { config = JSON.parse(row.config_json); } catch (_) {}
  }
  return {
    status: row?.status || 'NOT_CONNECTED',
    session: config.session || '',
    account: config.account || null,
    apiId: Number(process.env.TELEGRAM_API_ID || 30616080),
    apiHash: getApiHash()
  };
}

function saveTelegramConfig(db, uid, config, status = 'CONNECTED') {
  const jsonStr = JSON.stringify(config);
  db.prepare(`
    INSERT INTO integrations (user_id, provider, status, config_json)
    VALUES (?, 'TELEGRAM', ?, ?)
    ON CONFLICT(user_id, provider) DO UPDATE SET status = excluded.status, config_json = excluded.config_json
  `).run(uid, status, jsonStr);
}

// Instantiate an active client for a user
async function getConnectedClient(db, uid) {
  const conf = getTelegramConfig(db, uid);
  if (!conf.session || !conf.apiId || !conf.apiHash) return null;

  const stringSession = new StringSession(conf.session);
  const client = new TelegramClient(stringSession, conf.apiId, conf.apiHash, {
    connectionRetries: 3,
    useWSS: false,
    autoReconnect: false
  });
  client._loopStarted = true; // Prevent background ping update loop

  await client.connect();
  return client;
}

// Step 1: Send authentication OTP code to user's phone number
async function sendAuthCode(db, uid, phoneNumber) {
  const apiId = Number(process.env.TELEGRAM_API_ID || 30616080);
  const apiHash = getApiHash();

  if (!apiId || !apiHash) {
    throw new Error('TELEGRAM_API_ID and TELEGRAM_API_HASH must be configured in .env');
  }

  // Destroy previous pending session if one exists to free resources
  if (pendingAuthSessions.has(uid)) {
    try { await pendingAuthSessions.get(uid).client.destroy(); } catch (_) {}
    pendingAuthSessions.delete(uid);
  }

  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 3,
    useWSS: false,
    autoReconnect: false
  });
  client._loopStarted = true; // Prevent background ping update loop

  await client.connect();

  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  try {
    const { phoneCodeHash, isCodeViaApp } = await client.sendCode(
      { apiId, apiHash },
      cleanPhone
    );

    pendingAuthSessions.set(uid, {
      client,
      phoneNumber: cleanPhone,
      phoneCodeHash
    });

    return {
      ok: true,
      phone: cleanPhone,
      phoneCodeHash,
      isCodeViaApp: Boolean(isCodeViaApp),
      message: isCodeViaApp
        ? 'Verification code sent to your Telegram app (check chat from Telegram).'
        : 'Verification code sent via SMS.'
    };
  } catch (err) {
    try { await client.destroy(); } catch (_) {}
    if (err.errorMessage === 'FLOOD' || err.seconds) {
      throw new Error(`Telegram rate limit: Please wait ${err.seconds || 60} seconds before requesting another code.`);
    }
    if (err.errorMessage === 'PHONE_NUMBER_INVALID') {
      throw new Error('Invalid phone number. Include country code (e.g. +91...).');
    }
    throw err;
  }
}

// Step 2: Verify OTP code and 2FA password
async function verifyAuthCode(db, uid, phoneCode, password = '') {
  const pending = pendingAuthSessions.get(uid);
  if (!pending) {
    throw new Error('No pending Telegram login session found. Please click Back and request a code first.');
  }

  const { client, phoneNumber, phoneCodeHash } = pending;
  const cleanCode = String(phoneCode).replace(/\D/g, '').trim();
  if (!cleanCode) {
    throw new Error('Please enter the OTP verification code.');
  }

  const { Api } = require('telegram');

  try {
    await client.invoke(new Api.auth.SignIn({
      phoneNumber,
      phoneCodeHash,
      phoneCode: cleanCode
    }));
  } catch (err) {
    if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      if (!password) {
        return { requiresPassword: true, error: 'Two-step verification (2FA) is enabled on your account. Please enter your 2FA password.' };
      }
      try {
        const { computeCheck } = require('telegram/Password');
        const passwordSrpResult = await client.invoke(new Api.account.GetPassword());
        const passwordSrpCheck = await computeCheck(passwordSrpResult, password);
        await client.invoke(new Api.auth.CheckPassword({
          password: passwordSrpCheck
        }));
      } catch (pwdErr) {
        if (pwdErr.errorMessage === 'PASSWORD_HASH_INVALID') {
          throw new Error('Incorrect 2FA password. Please check and re-enter.');
        }
        throw pwdErr;
      }
    } else if (err.errorMessage === 'PHONE_CODE_INVALID') {
      throw new Error('Invalid verification code. Please check the code sent to your Telegram app.');
    } else if (err.errorMessage === 'PHONE_CODE_EXPIRED') {
      throw new Error('Verification code has expired. Please go back and request a new code.');
    } else {
      throw err;
    }
  }

  const me = await client.getMe();
  const sessionString = client.session.save();

  saveTelegramConfig(db, uid, {
    session: sessionString,
    account: {
      id: me.id?.toString(),
      firstName: me.firstName || '',
      lastName: me.lastName || '',
      username: me.username || '',
      phone: me.phone || phoneNumber
    }
  }, 'CONNECTED');

  try { await client.destroy(); } catch (_) {}
  pendingAuthSessions.delete(uid);

  return {
    ok: true,
    connected: true,
    account: {
      firstName: me.firstName,
      username: me.username,
      phone: me.phone || phoneNumber
    }
  };
}

// Get connected account details
async function getTelegramStatus(db, uid) {
  const conf = getTelegramConfig(db, uid);
  if (!conf.session) {
    return { connected: false, configured: Boolean(conf.apiId && conf.apiHash) };
  }

  return {
    connected: conf.status === 'CONNECTED',
    configured: Boolean(conf.apiId && conf.apiHash),
    account: conf.account
  };
}

// Retrieve channels/groups the authenticated account belongs to
async function getAccessibleSources(db, uid) {
  const client = await getConnectedClient(db, uid);
  if (!client) throw new Error('Telegram is not connected. Please authenticate first.');

  try {
    const dialogs = await client.getDialogs({ limit: 80 });
    const channelsAndGroups = dialogs.filter(d => d.isChannel || d.isGroup);

    for (const d of channelsAndGroups) {
      const peerId = d.id ? d.id.toString() : '';
      const title = d.title || d.name || 'Untitled Channel';
      const username = d.entity?.username || null;
      const isChannel = d.isChannel ? 1 : 0;
      const isGroup = d.isGroup ? 1 : 0;

      db.prepare(`
        INSERT INTO telegram_sources (user_id, peer_id, title, username, is_channel, is_group, selected)
        VALUES (?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(user_id, peer_id) DO UPDATE SET title = excluded.title, username = excluded.username
      `).run(uid, peerId, title, username, isChannel, isGroup);
    }

    return db.prepare('SELECT * FROM telegram_sources WHERE user_id = ? ORDER BY title').all(uid);
  } finally {
    try { await client.destroy(); } catch (_) {}
  }
}

// Toggle whether a source is selected for study scanning
function toggleSource(db, uid, sourceId, selected) {
  db.prepare('UPDATE telegram_sources SET selected = ? WHERE id = ? AND user_id = ?').run(selected ? 1 : 0, sourceId, uid);
  return { ok: true };
}

// CBSE Syllabus keyword classifier
function classifyContent(text = '', fileName = '') {
  const combined = `${fileName} ${text}`.toLowerCase();

  const subjectRules = [
    {
      subjectCode: 'physics',
      name: 'Physics',
      keywords: ['physics', 'kinematics', 'motion', 'newton', 'force', 'friction', 'gravitation', 'vector', 'projectile', 'rotational', 'thermodynamics', 'oscillation', 'work energy']
    },
    {
      subjectCode: 'chemistry',
      name: 'Chemistry',
      keywords: ['chemistry', 'mole', 'stoichiometry', 'atom', 'periodic', 'bonding', 'vsepr', 'redox', 'thermodynamics', 'equilibrium', 'hydrocarbon', 'organic']
    },
    {
      subjectCode: 'mathematics',
      name: 'Mathematics',
      keywords: ['math', 'mathematics', 'sets', 'relations', 'functions', 'trigonometry', 'trig', 'inequality', 'permutation', 'combination', 'binomial', 'geometry', 'calculus', 'limits', 'derivative']
    },
    {
      subjectCode: 'computer',
      name: 'Computer Science',
      keywords: ['computer', 'python', 'algorithm', 'flowchart', 'binary', 'encoding', 'loops', 'list', 'tuple', 'dictionary', 'strings', 'ipr', 'cyber']
    },
    {
      subjectCode: 'english',
      name: 'English',
      keywords: ['english', 'hornbill', 'snapshots', 'portrait of a lady', 'tut', 'ailing planet', 'grammar', 'tenses', 'speech', 'poster', 'writing']
    }
  ];

  let detectedSubjectCode = 'physics';
  let maxMatches = 0;

  for (const rule of subjectRules) {
    let matches = 0;
    for (const kw of rule.keywords) {
      if (combined.includes(kw)) matches++;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedSubjectCode = rule.subjectCode;
    }
  }

  // Detect Resource Type
  let resourceType = 'Notes';
  if (combined.includes('ncert')) resourceType = 'NCERT';
  else if (combined.includes('question') || combined.includes('assignment') || combined.includes('sheet')) resourceType = 'Question Sheet';
  else if (combined.includes('test') || combined.includes('paper') || combined.includes('exam') || combined.includes('pyq')) resourceType = 'Test';
  else if (combined.includes('lecture') || combined.includes('video') || combined.includes('mp4')) resourceType = 'Lecture';
  else if (combined.includes('revision') || combined.includes('formula') || combined.includes('mindmap')) resourceType = 'Revision';

  return { subjectCode: detectedSubjectCode, resourceType };
}

// Scan selected Telegram sources for new study content
async function scanSelectedSources(db, uid) {
  const client = await getConnectedClient(db, uid);
  if (!client) throw new Error('Telegram client is not connected.');

  const sources = db.prepare('SELECT * FROM telegram_sources WHERE user_id = ? AND selected = 1').all(uid);
  if (sources.length === 0) {
    return { scanned: 0, newItems: 0, message: 'No Telegram channels/groups selected for scanning.' };
  }

  let totalNew = 0;

  try {
    for (const src of sources) {
      try {
        const entity = await client.getEntity(src.peer_id);
        const messages = await client.getMessages(entity, { limit: 30 });

        for (const msg of messages) {
          if (!msg || (!msg.media && (!msg.message || msg.message.length < 15))) continue;

          const msgId = msg.id;
          // Duplicate check
          const existing = db.prepare('SELECT id FROM telegram_materials WHERE user_id = ? AND source_id = ? AND message_id = ?').get(uid, src.id, msgId);
          if (existing) continue;

          let fileName = 'Study Notes / Text Document';
          let fileSize = 0;
          let mimeType = 'text/plain';
          let mediaType = 'NOTE';

          if (msg.media) {
            if (msg.media.document) {
              const doc = msg.media.document;
              fileSize = doc.size ? Number(doc.size) : 0;
              mimeType = doc.mimeType || 'application/octet-stream';
              const fileAttr = (doc.attributes || []).find(a => a.fileName);
              if (fileAttr) fileName = fileAttr.fileName;
              mediaType = mimeType.includes('pdf') ? 'PDF' : mimeType.includes('video') ? 'VIDEO' : 'DOCUMENT';
            } else if (msg.media.photo) {
              mediaType = 'PHOTO';
              fileName = `Telegram Photo ${msgId}.jpg`;
              mimeType = 'image/jpeg';
            }
          }

          const textContent = msg.message || '';
          const tgUrl = src.username ? `https://t.me/${src.username}/${msgId}` : `https://t.me/c/${src.peer_id.replace('-100', '')}/${msgId}`;
          const msgDate = msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString();

          // Save into telegram_materials
          db.prepare(`
            INSERT INTO telegram_materials (user_id, source_id, message_id, file_name, file_size, mime_type, text_content, media_type, telegram_url, date, import_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEEDS_REVIEW')
          `).run(uid, src.id, msgId, fileName, fileSize, mimeType, textContent, mediaType, tgUrl, msgDate);

          // Classification into Subject -> Chapter -> Topic
          const { subjectCode, resourceType } = classifyContent(textContent, fileName);
          const subj = db.prepare('SELECT id FROM subjects WHERE user_id = ? AND code = ?').get(uid, subjectCode);

          let suggestedChapterId = null;
          let suggestedTopicId = null;

          if (subj) {
            // Find best matching chapter in this subject
            const chapters = db.prepare('SELECT id, title FROM chapters WHERE subject_id = ?').all(subj.id);
            for (const ch of chapters) {
              if (textContent.toLowerCase().includes(ch.title.toLowerCase()) || fileName.toLowerCase().includes(ch.title.toLowerCase())) {
                suggestedChapterId = ch.id;
                break;
              }
            }
            if (!suggestedChapterId && chapters.length > 0) {
              suggestedChapterId = chapters[0].id;
            }
          }

          // Insert into import_review_items
          db.prepare(`
            INSERT INTO import_review_items (user_id, provider, file_name, status, suggested_subject_id, suggested_chapter_id, suggested_topic_id, resource_type, source_ref, file_size, mime_type)
            VALUES (?, 'TELEGRAM', ?, 'NEEDS_REVIEW', ?, ?, ?, ?, ?, ?, ?)
          `).run(uid, fileName, subj?.id || null, suggestedChapterId, suggestedTopicId, resourceType, tgUrl, fileSize, mimeType);

          totalNew++;
        }

        db.prepare('UPDATE telegram_sources SET last_scanned_at = CURRENT_TIMESTAMP WHERE id = ?').run(src.id);
      } catch (srcErr) {
        console.warn(`Could not scan channel ${src.title}:`, srcErr.message);
      }
    }

    return {
      scanned: sources.length,
      newItems: totalNew,
      message: `Scanned ${sources.length} sources. Found ${totalNew} new study materials awaiting Import Review.`
    };
  } finally {
    try { await client.destroy(); } catch (_) {}
  }
}

// Disconnect Telegram session securely
function disconnectTelegram(db, uid) {
  db.prepare("UPDATE integrations SET status = 'NOT_CONNECTED', config_json = NULL WHERE user_id = ? AND provider = 'TELEGRAM'").run(uid);
  return { ok: true };
}

module.exports = {
  sendAuthCode,
  verifyAuthCode,
  getTelegramStatus,
  getAccessibleSources,
  toggleSource,
  scanSelectedSources,
  disconnectTelegram
};

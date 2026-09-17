// Class 11 Study OS — Frontend Application (Stage 4 Complete Integrations & School Notebooks)

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const api = async (url, options = {}) => {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const meta = {
  physics: ['Physics', '#d6764d'],
  chemistry: ['Chemistry', '#6879cc'],
  mathematics: ['Mathematics', '#46a094'],
  computer: ['Computer Science', '#a57bd1'],
  english: ['English', '#d5a342']
};

let boot, subjectDetail, chapterDetail, currentTopic, practiceData = null, practiceIndex = 0;
let dailyWorkCategory = 'ALL';
let backlogFilter = 'ALL';
let notebookFilter = 'ALL';
let currentlyPlayingTrack = null;
let spotifyInterval = null;

// Injected styles for Stage 4 components
const style = document.createElement('style');
style.textContent = `
  #app-shell { visibility: hidden; }
  .main { padding-bottom: 84px !important; } /* Make room for persistent Spotify dock */
  .empty { background: var(--paper); border: 1px dashed #d9dad4; border-radius: 16px; padding: 28px; text-align: center; color: var(--muted); }
  .empty h3 { color: var(--ink); margin-bottom: 6px; }
  .empty p { font-size: 12px; margin-bottom: 14px; }
  .empty .primary { margin: 3px; }
  .page-actions { display: flex; gap: 9px; align-items: center; flex-wrap: wrap; }
  .section-title .primary { padding: 8px 14px; }
  .modal-layer, .setup-layer { position: fixed; inset: 0; background: rgba(20,21,31,.62); z-index: 50; display: grid; place-items: center; padding: 20px; backdrop-filter: blur(6px); }
  .modal { background: var(--bg); border-radius: 21px; width: min(660px, 100%); max-height: 92vh; overflow: auto; padding: 28px; box-shadow: 0 20px 70px rgba(0,0,0,.26); }
  .modal-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
  .modal-top h2 { margin: 0; }
  .close { font-size: 22px; background: transparent; color: var(--muted); cursor: pointer; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field { display: grid; gap: 6px; margin-bottom: 13px; }
  .field.full { grid-column: 1/-1; }
  .field label { font: 10px 'DM Mono', monospace; color: var(--muted); letter-spacing: .5px; text-transform: uppercase; }
  .field input, .field select, .field textarea { border: 1px solid #dadbd5; background: #fff; border-radius: 9px; padding: 10px 11px; font: 12px Manrope, sans-serif; color: var(--ink); width: 100%; box-sizing: border-box; }
  .field textarea { min-height: 74px; resize: vertical; }
  .modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
  
  /* Tabs */
  .category-tabs { display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px; }
  .cat-tab { padding: 8px 14px; border-radius: 10px; background: #e8e8e2; color: var(--muted); font-size: 11px; font-weight: 700; border: 0; cursor: pointer; white-space: nowrap; transition: .2s; }
  .cat-tab:hover { background: #dedfd7; }
  .cat-tab.active { background: var(--nav); color: #fff; }

  /* Work / Task Cards */
  .work-card { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; margin-bottom: 10px; display: grid; grid-template-columns: 24px 1fr auto; gap: 14px; align-items: start; transition: .2s; }
  .work-card:hover { border-color: #cbd0c6; box-shadow: 0 4px 15px rgba(0,0,0,.03); }
  .work-card.done { opacity: 0.65; background: #fbfbf9; }
  .work-card.done .work-title { text-decoration: line-through; color: var(--muted); }
  .work-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 6px; }
  .tag { font: 9px 'DM Mono', monospace; padding: 3px 7px; border-radius: 6px; letter-spacing: .5px; text-transform: uppercase; font-weight: 600; }
  .tag-school { background: #e8f0fe; color: #1a73e8; }
  .tag-tuition { background: #fef7e0; color: #b06000; }
  .tag-study { background: #e6f4ea; color: #137333; }
  .tag-notebook { background: #f3e8fd; color: #7b1fa2; }
  .tag-homework { background: #e0f2fe; color: #0284c7; }
  .tag-revision { background: #fdf4ff; color: #a21caf; }
  .tag-clat { background: #fce8e6; color: #c5221f; }
  .tag-priority-high { background: #ffebee; color: #c62828; }
  .tag-priority-med { background: #fff8e1; color: #f57f17; }
  .tag-priority-low { background: #f1f8e9; color: #558b2f; }
  .tag-marks { background: #f3e8fd; color: #7b1fa2; }

  /* Smart Time Budget Cards */
  .budget-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 11px; margin-bottom: 20px; }
  .budget-card { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; text-align: left; }
  .budget-card span { font: 10px 'DM Mono', monospace; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; display: block; }
  .budget-card b { font-size: 20px; display: block; margin-top: 4px; color: var(--ink); }

  /* Teacher Important Section */
  .teacher-section { background: #fffdf5; border: 1.5px solid #f6e3a5; border-radius: 18px; padding: 22px 24px; margin-top: 24px; }
  .teacher-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .teacher-header h2 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 19px; }
  .teacher-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .teacher-card { background: #fff; border: 1px solid #ebd998; border-radius: 12px; padding: 14px 16px; }
  .teacher-card b { font-size: 13px; display: block; }
  .teacher-card p { font-size: 11px; color: var(--muted); margin: 4px 0 8px; line-height: 1.45; }

  /* School Notebook System */
  .notebook-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 13px; margin-bottom: 24px; }
  .notebook-sub-card { background: var(--paper); border: 1px solid var(--line); border-radius: 16px; padding: 18px; position: relative; overflow: hidden; }
  .notebook-sub-card b { font-size: 15px; display: block; }
  .notebook-sub-card small { font-size: 11px; color: var(--muted); display: block; margin: 4px 0 12px; }

  /* Persistent Compact Spotify Dock */
  .spotify-dock { position: fixed; bottom: 0; left: 0; right: 0; height: 68px; background: rgba(24, 26, 42, 0.95); backdrop-filter: blur(14px); color: #fff; z-index: 45; border-top: 1px solid #333647; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; box-shadow: 0 -4px 25px rgba(0,0,0,.28); }
  .spotify-track-info { display: flex; align-items: center; gap: 14px; min-width: 220px; max-width: 320px; }
  .spotify-art { width: 44px; height: 44px; border-radius: 8px; background: #373a48; object-fit: cover; display: grid; place-items: center; font-size: 18px; color: #1db954; flex-shrink: 0; }
  .spotify-names { overflow: hidden; }
  .spotify-names b { display: block; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .spotify-names small { display: block; font-size: 10px; color: #9da0ae; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .spotify-controls { display: flex; align-items: center; gap: 12px; }
  .spotify-btn { background: transparent; color: #fff; border: 0; cursor: pointer; font-size: 16px; padding: 6px; border-radius: 50%; display: grid; place-items: center; transition: .2s; }
  .spotify-btn:hover { color: #1db954; transform: scale(1.1); }
  .spotify-play-btn { width: 34px; height: 34px; background: #fff; color: #181a2a; border-radius: 50%; font-size: 15px; font-weight: bold; }
  .spotify-play-btn:hover { background: #1db954; color: #fff; }
  .spotify-extra { display: flex; align-items: center; gap: 14px; }
  .spotify-pill { font: 10px 'DM Mono', monospace; background: #282a3a; color: #1db954; padding: 5px 9px; border-radius: 8px; display: flex; align-items: center; gap: 6px; cursor: pointer; border: 0; }
  .spotify-pill:hover { background: #333649; }

  /* Telegram Import Review */
  .review-item-card { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; margin-bottom: 12px; display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: center; }
  .review-inputs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
  .review-inputs select, .review-inputs input { font-size: 11px; padding: 6px 8px; border-radius: 6px; border: 1px solid #dadbd5; }

  /* Priority Reasons Box */
  .priority-box { background: #fffbf7; border: 1px solid #f3d7be; border-radius: 12px; padding: 12px 14px; margin-top: 8px; }
  .priority-title { font: 10px 'DM Mono', monospace; color: #b4522b; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; }
  .reason-list { display: grid; gap: 4px; font-size: 11px; }
  .reason-item { display: flex; align-items: center; gap: 7px; color: #4e5058; }

  /* Practice & AI Evaluation */
  .practice-container { max-width: 860px; margin: 0 auto; }
  .mcq-options { display: grid; gap: 8px; margin: 18px 0; }
  .mcq-option { padding: 12px 16px; border: 1.5px solid var(--line); border-radius: 12px; background: #fff; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 13px; transition: .2s; }
  .mcq-option:hover { border-color: var(--ink); }
  .mcq-option.selected { border-color: var(--green); background: #f3f9f4; font-weight: 700; }
  .rubric-box { background: #fdfbf7; border: 1.5px solid #ebd998; border-radius: 14px; padding: 18px 20px; margin: 18px 0; }
  .ai-unconfigured { background: #fff5f5; border: 1.5px solid #fed7d7; border-radius: 14px; padding: 16px 20px; margin-bottom: 20px; color: #9b2c2c; }
  .ai-unconfigured b { display: block; font-size: 13px; margin-bottom: 4px; }
  .ai-unconfigured p { font-size: 11px; margin: 0; line-height: 1.5; }

  .revision-chip { font: 10px 'DM Mono', monospace; background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 6px; }

  @media(max-width:768px) {
    .budget-grid { grid-template-columns: 1fr 1fr; }
    .teacher-grid { grid-template-columns: 1fr; }
    .form-grid { grid-template-columns: 1fr; }
    .work-card { grid-template-columns: 24px 1fr; }
    .spotify-dock { padding: 0 14px; height: 60px; }
    .spotify-track-info { min-width: 140px; }
    .review-inputs { grid-template-columns: 1fr; }
  }
`;
document.head.append(style);

function toast(t) {
  let x = $('#toast');
  if (!x) {
    x = document.createElement('div');
    x.id = 'toast';
    x.className = 'toast';
    document.body.append(x);
  }
  x.textContent = t;
  x.classList.add('show');
  setTimeout(() => x.classList.remove('show'), 2800);
}

function esc(v = '') {
  return String(v).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function dateLabel(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(date + 'T00:00:00'));
}

function statusLabel(s = '') {
  return s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function theme(s = {}) {
  document.documentElement.style.setProperty('--subject', s.color || '#557c6c');
  document.documentElement.style.setProperty('--subject-deep', s.color || '#557c6c');
  document.documentElement.style.setProperty('--subject-soft', '#d6f35f');
  document.documentElement.style.setProperty('--subject-light', '#edf2ec');
}

// Render Core App Shell with persistent Spotify Player dock
function shell() {
  $('#app-shell').innerHTML = `
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">✦</div><div>CLASS 11<small>STUDY COMMAND</small></div></div>
      <p class="nav-label">DAILY &amp; STUDY</p>
      <nav class="nav">
        <button class="active" data-route="home"><span class="nav-icon">⌂</span>Home</button>
        <button data-route="daily-work"><span class="nav-icon">🏫</span>Daily Work <span id="homework-badge" style="margin-left:auto;font:10px 'DM Mono';background:#3a3c4d;padding:2px 6px;border-radius:6px">0</span></button>
        <button data-route="notebooks"><span class="nav-icon">📚</span>School Notebooks</button>
        <button data-route="plan"><span class="nav-icon">◷</span>Study Plan</button>
        <button data-route="teacher-topics"><span class="nav-icon">⭐</span>Teacher Topics</button>
        <button data-route="backlog"><span class="nav-icon">↗</span>Backlog <span id="backlog-badge" style="margin-left:auto;font:10px 'DM Mono';background:#3a3c4d;padding:2px 6px;border-radius:6px">18</span></button>
        <button data-route="exams"><span class="nav-icon">◉</span>Exams</button>
      </nav>
      <p class="nav-label nav-subjects">SUBJECTS</p>
      <nav class="nav" id="subject-nav"></nav>
      <p class="nav-label" style="margin-top:18px">EXTRAS &amp; SYNC</p>
      <nav class="nav">
        <button data-modal="telegram-sync"><span class="nav-icon">✈</span>Telegram Sync <span id="tg-badge" style="font:9px 'DM Mono';color:#7f8290;margin-left:auto">READY</span></button>
        <button data-route="clat"><span class="nav-icon">◇</span>CLAT <span style="font:9px 'DM Mono';color:#7f8290;margin-left:auto">SECONDARY</span></button>
        <button data-route="settings"><span class="nav-icon">⚙</span>Settings</button>
      </nav>
      <div class="study-streak">
        <span class="mono">PERSONAL SYSTEM</span>
        <strong id="profile-name">Student</strong>
        <p>Mastery is earned topic by topic through real practice evidence.</p>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="crumb" id="breadcrumb"><strong>Home</strong></div>
        <div class="top-actions">
          <button class="spotify-pill" id="btn-spotify-search" title="Search music on Spotify">
            <span>♫</span> Spotify Search
          </button>
          <span class="date" id="today-date"></span>
          <div class="avatar" id="avatar">ST</div>
        </div>
      </header>
      <section class="view" id="home"></section>
      <section class="view" id="daily-work-view"></section>
      <section class="view" id="notebooks-view"></section>
      <section class="view" id="teacher-topics-view"></section>
      <section class="view" id="subject-view"></section>
      <section class="view" id="chapter-view"></section>
      <section class="view" id="topic-view"></section>
      <section class="view" id="practice-view"></section>
      <section class="view" id="evaluation-view"></section>
      <section class="view" id="plan-view"></section>
      <section class="view" id="exams-view"></section>
      <section class="view" id="backlog-view"></section>
      <section class="view" id="settings-view"></section>
      <section class="view" id="clat-view"></section>
    </main>

    <!-- Persistent Compact Spotify Dock -->
    <div class="spotify-dock" id="spotify-dock">
      <div class="spotify-track-info">
        <div class="spotify-art" id="spotify-art">♫</div>
        <div class="spotify-names">
          <b id="spotify-title">Study Beats &amp; Focus</b>
          <small id="spotify-artist">Spotify Connected</small>
        </div>
      </div>
      <div class="spotify-controls">
        <button class="spotify-btn" data-spotify-action="previous" title="Previous">⏮</button>
        <button class="spotify-btn spotify-play-btn" id="spotify-play-btn" data-spotify-action="play" title="Play / Pause">▶</button>
        <button class="spotify-btn" data-spotify-action="next" title="Next">⏭</button>
      </div>
      <div class="spotify-extra">
        <button class="spotify-pill" data-modal="spotify-player">
          <span style="color:#1db954">●</span> Music / Playlists
        </button>
      </div>
    </div>
  `;
  $('#app-shell').style.visibility = 'visible';
  $('#today-date').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date()).toUpperCase();
}

function setRoute(route, crumb = '') {
  const target = route === 'home' ? $('#home') : $('#' + route + '-view');
  $$('.view').forEach(v => v.classList.remove('active'));
  if (!target) throw new Error(`Unknown view: ${route}`);
  target.classList.add('active');
  $$('.nav button').forEach(x => x.classList.toggle('active', x.dataset.route === route));
  $('#breadcrumb').innerHTML = crumb || `<strong>${route === 'home' ? 'Home' : statusLabel(route)}</strong>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function refresh() {
  boot = await api('/api/bootstrap');
  $('#profile-name').textContent = boot.user.name;
  $('#avatar').textContent = boot.user.name.slice(0, 2).toUpperCase();
  $('#backlog-badge').textContent = boot.backlog.filter(b => b.status === 'OPEN').length;
  $('#homework-badge').textContent = boot.dailyWork.filter(w => w.status === 'OPEN').length;
  $('#subject-nav').innerHTML = boot.subjects.map(s => `
    <button class="nav-subject" data-subject="${s.id}">
      <span class="subject-dot" style="background:${s.color}"></span>${esc(s.name)}
    </button>
  `).join('');

  if (boot.telegramStatus?.connected) {
    $('#tg-badge').textContent = 'CONNECTED';
    $('#tg-badge').style.color = '#10b981';
  }

  updateSpotifyDock();
}

// Update the Persistent Spotify Dock with live playback info
async function updateSpotifyDock() {
  if (!boot.spotifyStatus?.connected) {
    $('#spotify-title').textContent = 'Spotify: Not Connected';
    $('#spotify-artist').textContent = 'Click to connect in Settings';
    return;
  }

  try {
    const p = await api('/api/integrations/spotify/player');
    if (p.track) {
      currentlyPlayingTrack = p.track;
      $('#spotify-title').textContent = p.track.name;
      $('#spotify-artist').textContent = p.track.artist;
      if (p.track.albumArt) {
        $('#spotify-art').innerHTML = `<img src="${p.track.albumArt}" style="width:100%;height:100%;border-radius:8px;object-fit:cover" />`;
      }
      $('#spotify-play-btn').textContent = p.isPlaying ? '⏸' : '▶';
      $('#spotify-play-btn').dataset.spotifyAction = p.isPlaying ? 'pause' : 'play';
    } else {
      $('#spotify-title').textContent = 'Ready to play';
      $('#spotify-artist').textContent = 'Select a study playlist or search';
    }
  } catch (_) {}
}

function empty(title, text, actions = '') {
  return `<div class="empty"><h3>${title}</h3><p>${text}</p>${actions}</div>`;
}

// ----------------------------------------------------
// HOME PAGE VIEW (Clean & Compact with Smart Budget)
// ----------------------------------------------------
function renderHome() {
  const upcoming = boot.exams[0];
  const openHomework = boot.dailyWork.filter(w => w.status === 'OPEN');
  const openBacklog = boot.backlog.filter(b => b.status === 'OPEN');
  const topTeacherTopics = boot.teacherTopics.slice(0, 3);
  const nextStudy = boot.tasks.find(t => t.task_type === 'STUDY' && t.status === 'OPEN') || boot.tasks[0];
  const nbProgress = boot.notebookProgress;
  const budget = boot.smartBudget;

  $('#home').innerHTML = `
    <div class="hero">
      <p class="eyebrow">GOOD DAY, ${esc(boot.user.name).toUpperCase()}</p>
      <h1>What do you want to understand today?</h1>
      <p>Class 11 study rhythm: Smart Time Budget, school notebooks &amp; verified practice.</p>
      ${nextStudy ? `<div style="margin-top:18px"><button class="primary" data-route="plan">Continue Learning: ${esc(nextStudy.title)} →</button></div>` : ''}
      <div class="hero-star">✦</div>
    </div>

    <!-- Smart Time Budget Summary Card -->
    <div style="margin-top:20px">
      <div class="section-title">
        <h2>Today’s Study Budget</h2>
        <span style="font:11px 'DM Mono';color:var(--muted)">${esc(boot.schedule?.current_day_type?.replaceAll('_', ' ') || 'NORMAL SCHOOL DAY')}</span>
      </div>
      <div class="budget-grid">
        <div class="budget-card">
          <span>Available Today</span>
          <b>${budget.formattedAvailable}</b>
        </div>
        <div class="budget-card">
          <span>Allocated Tasks</span>
          <b>${budget.formattedAllocated}</b>
        </div>
        <div class="budget-card">
          <span>Buffer / Breaks</span>
          <b>${budget.formattedBuffer}</b>
        </div>
        <div class="budget-card">
          <span>Remaining Free</span>
          <b>${budget.formattedRemaining}</b>
        </div>
      </div>
    </div>

    <!-- Teacher Important Topics Preview -->
    <div class="teacher-section">
      <div class="teacher-header">
        <div>
          <h2>⭐ TEACHER IMPORTANT TOPICS</h2>
          <span style="font-size:11px;color:var(--muted)">Teacher-flagged topics receive prioritized allocation in your daily study plan.</span>
        </div>
        <button class="primary" data-modal="teacher-topic">+ Add Important Topic</button>
      </div>
      ${topTeacherTopics.length ? `
        <div class="teacher-grid">
          ${topTeacherTopics.map(tt => `
            <div class="teacher-card">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <span class="tag tag-priority-${tt.importance.toLowerCase() === 'high' ? 'high' : 'med'}">${esc(tt.importance)} IMPORTANCE</span>
                <span class="tag tag-marks">${tt.expected_marks} MARKS</span>
              </div>
              <b style="margin-top:8px">${esc(tt.subject_name)} · ${esc(tt.topic_title || tt.topic_name || tt.chapter_title)}</b>
              <p>${esc(tt.remarks || (tt.exam_name ? `Flagged for ${tt.exam_name}` : 'High yield exam topic'))}</p>
              ${tt.teacher_name ? `<small style="font-size:10px;color:var(--muted)">Teacher: ${esc(tt.teacher_name)}</small>` : ''}
            </div>
          `).join('')}
        </div>
        <div style="margin-top:12px;text-align:right">
          <button class="text-button" data-route="teacher-topics">VIEW ALL TEACHER TOPICS (${boot.teacherTopics.length}) →</button>
        </div>
      ` : empty('No teacher-important topics added yet.', 'Enter topics your teachers say are important to prioritize them in your plan.', '<button class="primary" data-modal="teacher-topic">+ Add Important Topic</button>')}
    </div>

    <div class="section-title">
      <h2>Your subjects</h2>
      <span>Class 11 CBSE · Real Mastery Derived</span>
    </div>
    <div class="subject-grid">
      ${boot.subjects.map((s, i) => `
        <button class="subject-card" data-subject="${s.id}" style="--subject:${s.color};--progress:${Math.round(s.progress)}%">
          <span class="subject-number">${String(i + 1).padStart(2, '0')}</span>
          <div class="subject-symbol" style="color:${s.color}">${s.name === 'Computer Science' ? 'CS' : s.name[0]}</div>
          <b>${esc(s.name)}</b>
          <small>${Math.round(s.progress)}% mastery</small>
          <i class="card-progress"></i>
        </button>
      `).join('')}
    </div>

    <!-- Home Bottom Grid: School Notebook Status & Today's Plan -->
    <div class="home-bottom" style="margin-top:24px">
      <div>
        <div class="section-title">
          <h2>📚 School Notebook Status</h2>
          <button class="text-button" data-route="notebooks">OPEN NOTEBOOKS →</button>
        </div>
        <div class="panel">
          ${!nbProgress.empty ? `
            <div style="display:grid;gap:10px">
              ${nbProgress.subjects.map(s => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)">
                  <div>
                    <strong style="font-size:13px">${esc(s.subjectName)}</strong>
                    <small style="display:block;color:var(--muted);font-size:11px">${s.message}</small>
                  </div>
                  ${s.progress !== null ? `
                    <div style="text-align:right">
                      <b style="font-size:14px;color:var(--green)">${s.progress}%</b>
                      <div class="progress-track" style="--p:${s.progress}%;width:80px;height:5px"><i></i></div>
                    </div>
                  ` : `<span style="font-size:11px;color:var(--muted)">Empty</span>`}
                </div>
              `).join('')}
            </div>
            <div style="margin-top:14px">
              <button class="primary" data-modal="school-work">+ Add School Work</button>
            </div>
          ` : empty('No school notebook work added yet.', 'Start by adding an assignment, class notes, or practical work.', '<button class="primary" data-modal="school-work">+ Add School Work</button>')}
        </div>
      </div>

      <div>
        <div class="section-title">
          <h2>Upcoming &amp; Sync Status</h2>
        </div>
        <div class="panel">
          ${upcoming ? `
            <div class="upcoming">
              <div class="calendar-block">
                <b>${new Date(upcoming.exam_date + 'T00:00:00').getDate()}</b>
                <small>${dateLabel(upcoming.exam_date).split(' ')[1]}</small>
              </div>
              <div>
                <strong>${esc(upcoming.name)}</strong>
                <p>${esc(upcoming.subject_name || 'General')} · ${upcoming.days_remaining < 0 ? 'Completed' : `${upcoming.days_remaining} days remaining`}</p>
              </div>
            </div>
          ` : empty('No exams scheduled.', 'Add exam dates to prioritize upcoming topics.', '<button class="outline" data-modal="exam">Add exam</button>')}
          
          <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--line)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <strong style="font-size:13px">Telegram Content Sync</strong>
                <small style="display:block;color:var(--muted)">${boot.telegramStatus?.connected ? 'Connected &amp; scanning channels' : 'Available for connection'}</small>
              </div>
              <button class="outline" data-modal="telegram-sync">Sync Status</button>
            </div>
          </div>

          <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <strong style="font-size:13px">Active Academic Backlog</strong>
                <small style="display:block;color:var(--muted)">${openBacklog.length} items remaining</small>
              </div>
              <button class="outline" data-route="backlog">View Backlog →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  setRoute('home');
}

// ----------------------------------------------------
// SCHOOL NOTEBOOK SYSTEM VIEW (📚 SCHOOL NOTEBOOKS)
// ----------------------------------------------------
async function renderNotebooks() {
  const schoolWork = await api('/api/school-work');
  const nbProgress = await api('/api/school-work/progress');

  const filtered = schoolWork.filter(w => {
    if (notebookFilter === 'ALL') return true;
    return w.subject_name?.toLowerCase() === notebookFilter.toLowerCase();
  });

  $('#notebooks-view').innerHTML = `
    <div class="section-title" style="margin-top:0">
      <div>
        <p class="eyebrow">NOTEBOOK TRACKING SYSTEM</p>
        <h1>📚 School Notebooks</h1>
        <p class="subcopy">Tracks your real classwork, homework, notes, and practicals. Completely independent from academic mastery.</p>
      </div>
      <button class="primary" data-modal="school-work">+ Add School Work</button>
    </div>

    <!-- Subject-wise Progress Cards -->
    <div class="notebook-grid">
      ${nbProgress.subjects.map(s => `
        <div class="notebook-sub-card">
          <span class="tag tag-school">${esc(s.subjectCode).toUpperCase()}</span>
          <b style="margin-top:8px">${esc(s.subjectName)}</b>
          <small>${s.message}</small>
          ${s.progress !== null ? `
            <div class="progress-track" style="--p:${s.progress}%;--tone:var(--green)"><i></i></div>
          ` : '<span style="font-size:11px;color:var(--muted)">0 items recorded</span>'}
        </div>
      `).join('')}
    </div>

    <!-- Filters -->
    <div class="category-tabs">
      <button class="cat-tab ${notebookFilter === 'ALL' ? 'active' : ''}" data-notebook-filter="ALL">All Subjects (${schoolWork.length})</button>
      <button class="cat-tab ${notebookFilter === 'Physics' ? 'active' : ''}" data-notebook-filter="Physics">Physics (${schoolWork.filter(w => w.subject_name === 'Physics').length})</button>
      <button class="cat-tab ${notebookFilter === 'Chemistry' ? 'active' : ''}" data-notebook-filter="Chemistry">Chemistry (${schoolWork.filter(w => w.subject_name === 'Chemistry').length})</button>
      <button class="cat-tab ${notebookFilter === 'Mathematics' ? 'active' : ''}" data-notebook-filter="Mathematics">Mathematics (${schoolWork.filter(w => w.subject_name === 'Mathematics').length})</button>
      <button class="cat-tab ${notebookFilter === 'Computer Science' ? 'active' : ''}" data-notebook-filter="Computer Science">Computer Science (${schoolWork.filter(w => w.subject_name === 'Computer Science').length})</button>
      <button class="cat-tab ${notebookFilter === 'English' ? 'active' : ''}" data-notebook-filter="English">English (${schoolWork.filter(w => w.subject_name === 'English').length})</button>
    </div>

    <!-- Work Items List -->
    ${filtered.length ? `
      <div>
        ${filtered.map(w => `
          <div class="work-card ${w.status === 'COMPLETED' ? 'done' : ''}">
            <button class="task-check" data-toggle-notebook="${w.id}">
              ${w.status === 'COMPLETED' ? '✓' : ''}
            </button>
            <div>
              <span class="work-title" style="font-size:14px;font-weight:700">${esc(w.description)}</span>
              <div class="work-meta">
                <span class="tag tag-notebook">${esc(w.work_type)}</span>
                <span class="tag tag-priority-${w.priority.toLowerCase() === 'high' ? 'high' : 'med'}">${esc(w.priority)}</span>
                <span style="font-size:11px;color:var(--muted)">${esc(w.subject_name)}</span>
                ${w.chapter_title ? `<span style="font-size:11px;color:var(--muted)">· ${esc(w.chapter_title)}</span>` : ''}
                ${w.due_date ? `<span style="font:10px 'DM Mono';color:#b4522b">Due: ${dateLabel(w.due_date)}</span>` : ''}
                <span style="font:10px 'DM Mono';color:var(--muted)">⏱ ${w.remaining_minutes}m remaining</span>
                <span class="tag ${w.status === 'COMPLETED' ? 'tag-study' : w.status === 'IN_PROGRESS' ? 'tag-school' : 'tag-priority-med'}">${statusLabel(w.status)}</span>
              </div>
              ${w.teacher ? `<small style="display:block;color:var(--muted);margin-top:4px">Teacher: ${esc(w.teacher)}</small>` : ''}
              ${w.remarks ? `<p style="font-size:11px;color:#5a5c66;margin:4px 0 0"><em>"${esc(w.remarks)}"</em></p>` : ''}
              ${w.attachment ? `<a href="${esc(w.attachment)}" target="_blank" style="font-size:11px;color:var(--green);margin-top:4px;display:inline-block">📎 View Attachment</a>` : ''}
            </div>
            <div class="page-actions">
              <select class="status-select" data-update-notebook-status="${w.id}" style="font-size:11px;padding:4px 8px;border-radius:6px;border:1px solid #dadbd5">
                <option value="NOT_STARTED" ${w.status === 'NOT_STARTED' ? 'selected' : ''}>Not Started</option>
                <option value="IN_PROGRESS" ${w.status === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
                <option value="COMPLETED" ${w.status === 'COMPLETED' ? 'selected' : ''}>Completed</option>
                <option value="NEEDS_CORRECTION" ${w.status === 'NEEDS_CORRECTION' ? 'selected' : ''}>Needs Correction</option>
              </select>
              <button class="danger" data-delete-notebook="${w.id}">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : empty('No school notebook work added yet.', 'This system starts completely empty. Add your real school classwork or homework assignments above.', '<button class="primary" data-modal="school-work">+ Add School Work</button>')}
  `;
  setRoute('notebooks');
}

// ----------------------------------------------------
// DAILY WORK VIEW (7 Distinct Categories)
// ----------------------------------------------------
function renderDailyWork() {
  const filtered = boot.dailyWork.filter(w => {
    if (dailyWorkCategory === 'ALL') return true;
    return w.category === dailyWorkCategory;
  });

  $('#daily-work-view').innerHTML = `
    <div class="section-title" style="margin-top:0">
      <div>
        <p class="eyebrow">CROSS-SUBJECT TASK HUB</p>
        <h1>Daily Work &amp; Homework</h1>
        <p class="subcopy">Tasks are categorized by commitment. Ordinary homework and notebook tasks can simply be completed with a checkbox.</p>
      </div>
      <button class="primary" data-modal="daily-work">+ Add Task / Homework</button>
    </div>

    <div class="category-tabs">
      <button class="cat-tab ${dailyWorkCategory === 'ALL' ? 'active' : ''}" data-work-cat="ALL">All Work (${boot.dailyWork.length})</button>
      <button class="cat-tab ${dailyWorkCategory === 'SCHOOL' ? 'active' : ''}" data-work-cat="SCHOOL">🏫 School</button>
      <button class="cat-tab ${dailyWorkCategory === 'TUITION' ? 'active' : ''}" data-work-cat="TUITION">👨🏫 Tuition</button>
      <button class="cat-tab ${dailyWorkCategory === 'NOTEBOOK' ? 'active' : ''}" data-work-cat="NOTEBOOK">📚 Notebook</button>
      <button class="cat-tab ${dailyWorkCategory === 'HOMEWORK' ? 'active' : ''}" data-work-cat="HOMEWORK">📝 Homework</button>
      <button class="cat-tab ${dailyWorkCategory === 'SELF_STUDY' ? 'active' : ''}" data-work-cat="SELF_STUDY">🎯 Self Study</button>
      <button class="cat-tab ${dailyWorkCategory === 'REVISION' ? 'active' : ''}" data-work-cat="REVISION">🔁 Revision</button>
      <button class="cat-tab ${dailyWorkCategory === 'CLAT' ? 'active' : ''}" data-work-cat="CLAT">⚖️ CLAT</button>
    </div>

    ${filtered.length ? `
      <div>
        ${filtered.map(w => `
          <div class="work-card ${w.status === 'DONE' ? 'done' : ''}">
            <button class="task-check" data-toggle-work="${w.id}">
              ${w.status === 'DONE' ? '✓' : ''}
            </button>
            <div>
              <span class="work-title" style="font-size:14px;font-weight:700">${esc(w.title)}</span>
              <div class="work-meta">
                <span class="tag tag-${w.category.toLowerCase()}">${esc(w.category)}</span>
                <span class="tag tag-priority-${w.priority.toLowerCase() === 'high' ? 'high' : 'med'}">${esc(w.priority)}</span>
                <span style="font-size:11px;color:var(--muted)">${esc(w.subject_name || 'General')}</span>
                ${w.chapter_title ? `<span style="font-size:11px;color:var(--muted)">· ${esc(w.chapter_title)}</span>` : ''}
                ${w.due_date ? `<span style="font:10px 'DM Mono';color:#b4522b">Due: ${dateLabel(w.due_date)}</span>` : ''}
                <span style="font:10px 'DM Mono';color:var(--muted)">⏱ ${w.estimated_minutes} min</span>
              </div>
              ${w.remarks ? `<p style="font-size:11px;color:#5a5c66;margin:6px 0 0"><em>"${esc(w.remarks)}"</em></p>` : ''}
              ${w.attachment ? `<a href="${esc(w.attachment)}" target="_blank" style="font-size:11px;color:var(--green);margin-top:4px;display:inline-block">📎 Attachment reference</a>` : ''}
            </div>
            <div class="page-actions">
              <button class="danger" data-delete-work="${w.id}">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : empty('No tasks in this category.', 'Add homework or study tasks using the button above.', '<button class="primary" data-modal="daily-work">+ Add Task / Homework</button>')}
  `;
  setRoute('daily-work');
}

// ----------------------------------------------------
// TEACHER IMPORTANT TOPICS VIEW
// ----------------------------------------------------
function renderTeacherTopics() {
  $('#teacher-topics-view').innerHTML = `
    <div class="section-title" style="margin-top:0">
      <div>
        <p class="eyebrow">TEACHER FLAG SYSTEM</p>
        <h1>⭐ Teacher Important Topics</h1>
        <p class="subcopy">Topics specifically flagged by teachers as high-yield or exam-critical. The priority engine boosts these in your daily schedule.</p>
      </div>
      <button class="primary" data-modal="teacher-topic">+ Add Important Topic</button>
    </div>

    ${boot.teacherTopics.length ? `
      <div style="display:grid;gap:12px">
        ${boot.teacherTopics.map(tt => `
          <div class="panel" style="display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start">
            <div>
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
                <span class="tag tag-priority-${tt.importance.toLowerCase() === 'high' ? 'high' : 'med'}">${esc(tt.importance)} IMPORTANCE</span>
                <span class="tag tag-marks">🎯 ${tt.expected_marks} EXPECTED MARKS</span>
                ${tt.exam_name ? `<span class="tag tag-school">Exam: ${esc(tt.exam_name)}</span>` : ''}
              </div>
              <h3 style="margin:4px 0 6px;font-size:16px">${esc(tt.subject_name)} · ${esc(tt.topic_title || tt.topic_name || tt.chapter_title)}</h3>
              ${tt.remarks ? `<p style="font-size:12px;color:#555;margin:4px 0">"${esc(tt.remarks)}"</p>` : ''}
              <div style="display:flex;gap:12px;font-size:11px;color:var(--muted);margin-top:6px">
                ${tt.teacher_name ? `<span>Teacher: <strong>${esc(tt.teacher_name)}</strong></span>` : ''}
                <span>Added: ${dateLabel(tt.date_added?.split(' ')[0])}</span>
              </div>
            </div>
            <div class="page-actions">
              <button class="danger" data-delete-teacher-topic="${tt.id}">Remove</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : empty('No teacher-important topics recorded.', 'Enter topics your teachers say are important to prioritize them in your plan.', '<button class="primary" data-modal="teacher-topic">+ Add Important Topic</button>')}
  `;
  setRoute('teacher-topics');
}

// ----------------------------------------------------
// STUDY PLAN VIEW (Smart Time Budget + Notebook Splitting)
// ----------------------------------------------------
function renderPlan() {
  const schedule = boot.schedule || {};
  const dayType = schedule.current_day_type || 'NORMAL_SCHOOL_DAY';
  const budget = boot.smartBudget;
  const remaining = boot.tasks.filter(t => t.status !== 'DONE').length;

  $('#plan-view').innerHTML = `
    <div class="section-title" style="margin-top:0">
      <div>
        <p class="eyebrow">BALANCED SCHEDULE · SLEEP PROTECTED</p>
        <h1>Daily Study Plan</h1>
        <p class="subcopy">Generated strictly within your real study capacity. Homework, school notebooks, exams, backlog &amp; teacher topics are balanced.</p>
      </div>
      <div class="page-actions">
        <select id="day-type-select" style="padding:8px 12px;border-radius:9px;border:1px solid #dadbd5;font-size:12px;font-weight:700">
          <option value="NORMAL_SCHOOL_DAY" ${dayType === 'NORMAL_SCHOOL_DAY' ? 'selected' : ''}>Normal School Day</option>
          <option value="HALF_DAY" ${dayType === 'HALF_DAY' ? 'selected' : ''}>Half Day (+90m study)</option>
          <option value="HOLIDAY" ${dayType === 'HOLIDAY' ? 'selected' : ''}>Holiday (+150m study)</option>
          <option value="SUNDAY" ${dayType === 'SUNDAY' ? 'selected' : ''}>Sunday (+120m study)</option>
          <option value="EXAM_DAY" ${dayType === 'EXAM_DAY' ? 'selected' : ''}>Exam Day (Targeted revision)</option>
        </select>
        <button class="primary" data-generate-plan>Generate / Replan</button>
      </div>
    </div>

    <!-- Smart Time Budget Row -->
    <div class="budget-grid">
      <div class="budget-card">
        <span>Available Today</span>
        <b>${budget.formattedAvailable}</b>
      </div>
      <div class="budget-card">
        <span>Allocated</span>
        <b>${budget.formattedAllocated}</b>
      </div>
      <div class="budget-card">
        <span>Buffer / Breaks</span>
        <b>${budget.formattedBuffer}</b>
      </div>
      <div class="budget-card">
        <span>Remaining Free</span>
        <b>${budget.formattedRemaining}</b>
      </div>
    </div>

    <div class="plan-layout">
      <div>
        <div class="section-title">
          <h2>Today’s Sessions</h2>
          <span>${remaining} remaining · ${budget.formattedAllocated} planned</span>
        </div>

        <div class="task-list">
          ${boot.tasks.length ? boot.tasks.map(t => {
            let reasons = [];
            try { if (t.priority_reasons) reasons = JSON.parse(t.priority_reasons); } catch (_) {}

            return `
              <div class="task ${t.status === 'DONE' ? 'done' : ''}">
                <button class="task-check" data-toggle-task="${t.id}">
                  ${t.status === 'DONE' ? '✓' : ''}
                </button>
                <div class="task-title">
                  <div style="display:flex;gap:7px;align-items:center">
                    <span class="tag tag-${(t.category || 'self_study').toLowerCase()}">${esc(t.category || 'STUDY')}</span>
                    <b>${esc(t.title)}</b>
                  </div>
                  <small>${esc(t.subject_name || 'Academic')} · ${t.task_type || 'Study'}</small>
                  
                  ${reasons.length ? `
                    <div class="priority-box">
                      <div class="priority-title">Why is this my priority?</div>
                      <div class="reason-list">
                        ${reasons.map(r => `
                          <div class="reason-item">
                            <span>${r.icon || '✦'}</span>
                            <span>${esc(r.text)}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
                <span class="task-time">${t.estimated_minutes}m</span>
              </div>
            `;
          }).join('') : empty('No study tasks planned for today.', 'Click Generate / Replan to build a realistic schedule based on your commitments.', '<button class="primary" data-generate-plan>Generate Plan</button>')}
        </div>
      </div>

      <aside>
        <div class="section-title"><h2>Commitments &amp; Rest</h2></div>
        <div class="plan-card">
          <p class="eyebrow">${dayType.replaceAll('_', ' ')}</p>
          <h3>${budget.formattedAllocated} planned</h3>
          <p>School: ${schedule.school_start || '07:30'}–${schedule.school_end || '14:30'} · Tuition: ${schedule.tuition_start || '16:00'}–${schedule.tuition_end || '18:00'}</p>
          <div class="workload-row">
            <b>Planned load</b>
            <span>${budget.allocatedMinutes} / ${budget.availableMinutes} min</span>
          </div>
          <div class="workload-bar"><i style="width:${Math.min(Math.round((budget.allocatedMinutes / budget.availableMinutes) * 100), 100)}%"></i></div>
          <p style="font-size:10px;color:#bfc2ca;margin-top:10px">Sleep protected: ${schedule.sleep_start || '23:00'} to ${schedule.sleep_end || '06:30'} (7.5h rest).</p>
        </div>

        <div class="clat-note">
          <b>CLAT Rule Enforced</b>
          <p>CLAT remains secondary. It is only scheduled when Class 11 urgent backlog and exam tasks are under control and spare capacity exists.</p>
        </div>
      </aside>
    </div>
  `;
  setRoute('plan');
}

// ----------------------------------------------------
// BACKLOG VIEW (18 Items, Editable, 0% Initial Mastery)
// ----------------------------------------------------
function renderBacklog() {
  const activeItems = boot.backlog.filter(b => b.status !== 'DONE');
  const completedItems = boot.backlog.filter(b => b.status === 'DONE');

  const filtered = activeItems.filter(b => {
    if (backlogFilter === 'ALL') return true;
    return b.subject_name?.toLowerCase() === backlogFilter.toLowerCase();
  });

  $('#backlog-view').innerHTML = `
    <div class="section-title" style="margin-top:0">
      <div>
        <p class="eyebrow">BACKLOG RECOVERY SYSTEM</p>
        <h1>Backlog Management</h1>
        <p class="subcopy">All items start with 0% mastery and are reduced only through deliberate learning and verified practice.</p>
      </div>
      <button class="primary" data-modal="backlog">+ Add Backlog Item</button>
    </div>

    <div class="category-tabs">
      <button class="cat-tab ${backlogFilter === 'ALL' ? 'active' : ''}" data-backlog-filter="ALL">All Subjects (${activeItems.length})</button>
      <button class="cat-tab ${backlogFilter === 'Physics' ? 'active' : ''}" data-backlog-filter="Physics">Physics (${activeItems.filter(b => b.subject_name === 'Physics').length})</button>
      <button class="cat-tab ${backlogFilter === 'Chemistry' ? 'active' : ''}" data-backlog-filter="Chemistry">Chemistry (${activeItems.filter(b => b.subject_name === 'Chemistry').length})</button>
      <button class="cat-tab ${backlogFilter === 'Mathematics' ? 'active' : ''}" data-backlog-filter="Mathematics">Mathematics (${activeItems.filter(b => b.subject_name === 'Mathematics').length})</button>
    </div>

    ${filtered.length ? `
      <div class="task-list">
        ${filtered.map(b => `
          <div class="backlog-card">
            <div>
              <div style="display:flex;gap:7px;align-items:center">
                <span class="tag tag-priority-${b.priority.toLowerCase() === 'high' ? 'high' : 'med'}">${b.priority}</span>
                <span class="tag tag-study">${Math.round(b.mastery || 0)}% MASTERY</span>
                <b style="font-size:14px">${esc(b.subject_name)} · ${esc(b.title || b.topic_title || b.chapter_title)}</b>
              </div>
              <small style="margin-top:4px">
                Chapter: ${esc(b.chapter_title || 'General')} · Estimated: ${b.estimated_minutes} min · Status: ${statusLabel(b.status)}
              </small>
              ${b.reason ? `<small style="color:#555;margin-top:2px">Reason: "${esc(b.reason)}"</small>` : ''}
              ${b.last_studied_at ? `<small style="color:var(--green)">Last studied: ${dateLabel(b.last_studied_at.split(' ')[0])}</small>` : ''}
            </div>
            <div class="page-actions">
              <button class="primary" data-start-backlog="${b.id}" data-chapter="${b.chapter_id || ''}" data-topic="${b.topic_id || ''}">Start Topic</button>
              <button class="outline" data-edit-backlog="${b.id}">Edit</button>
              <button class="danger" data-delete-backlog="${b.id}">Remove</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : empty('No open backlog items in this filter.', 'Great job! Keep moving through core syllabus topics.')}

    ${completedItems.length ? `
      <div style="margin-top:34px">
        <div class="section-title">
          <h2>Mastered Backlog History</h2>
          <span>${completedItems.length} items completed</span>
        </div>
        <div class="task-list">
          ${completedItems.map(b => `
            <div class="backlog-card" style="opacity:0.75;background:#fbfbf9">
              <div>
                <span class="tag tag-study">✓ MASTERED</span>
                <b style="font-size:13px;margin-left:6px">${esc(b.subject_name)} · ${esc(b.title || b.topic_title || b.chapter_title)}</b>
                <small style="display:block;color:var(--muted);margin-top:3px">Completed &amp; archived. Subject progress updated.</small>
              </div>
              <button class="outline" data-reopen-backlog="${b.id}">Reopen</button>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
  setRoute('backlog');
}

// ----------------------------------------------------
// SUBJECT & CHAPTER VIEWS
// ----------------------------------------------------
async function renderSubject(id) {
  subjectDetail = await api('/api/subjects/' + id);
  const { subject, chapters } = subjectDetail;
  theme(subject);

  $('#subject-view').innerHTML = `
    <div class="subject-hero">
      <div class="subject-identity">${subject.name === 'Computer Science' ? 'CS' : subject.name[0]}</div>
      <p class="eyebrow">${esc(subject.name).toUpperCase()} · ${esc(boot.user.syllabus).toUpperCase()}</p>
      <h1>Class 11 ${esc(subject.name)}</h1>
      <p>Mastery is calculated solely from your topic activity and verified practice scores.</p>
      <button class="primary" data-first-chapter="${chapters[0]?.id || ''}">Open first chapter →</button>
    </div>

    <div class="subject-stats">
      <div class="stat"><b>${Math.round(subjectDetail.subject.progress || 0)}%</b><span>actual mastery</span></div>
      <div class="stat"><b>${chapters.length}</b><span>chapters</span></div>
      <div class="stat"><b>${chapters.filter(c => c.progress > 0).length}</b><span>chapters started</span></div>
      <div class="stat"><b>${chapters.filter(c => c.progress >= 90).length}</b><span>mastered</span></div>
    </div>

    <div class="chapters-layout">
      <div>
        <div class="section-title"><h2>Chapters</h2><span>${chapters.length} chapters</span></div>
        <div class="chapter-list">
          ${chapters.map((c, i) => `
            <button class="chapter-card" data-chapter="${c.id}">
              <span class="chapter-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="chapter-name">
                <b>${esc(c.title)}</b>
                <small>${c.progress > 0 ? `${Math.round(c.progress)}% mastery` : 'Not started'}</small>
              </span>
              <span class="progress-track" style="--p:${c.progress}%;--tone:${subject.color}"><i></i></span>
              <span class="arrow">›</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div>
        <div class="section-title"><h2>Resources</h2></div>
        ${empty(`No ${esc(subject.name)} resources yet.`, 'Add a lecture, notes, NCERT link, Drive file or scan Telegram.', `<button class="primary" data-modal="resource" data-subject-id="${subject.id}">Add resource</button>`)}
      </div>
    </div>
  `;
  setRoute('subject', `<button class="back" data-route="home">‹</button><span>Subjects</span><span>›</span><strong>${esc(subject.name)}</strong>`);
}

async function renderChapter(id) {
  chapterDetail = await api('/api/chapters/' + id);
  const { chapter, topics, resources } = chapterDetail;
  theme({ color: chapter.color });
  const progress = topics.length ? topics.reduce((a, t) => a + Number(t.mastery || 0), 0) / topics.length : 0;

  $('#chapter-view').innerHTML = `
    <div class="chapter-head">
      <div>
        <p class="eyebrow">${esc(chapter.subject_name).toUpperCase()} · CHAPTER</p>
        <h1>${esc(chapter.title)}</h1>
        <p class="subcopy">Work through each topic: Learn → Practice → AI Evaluation → Mastery.</p>
      </div>
      <div class="chapter-progress">
        <b>${Math.round(progress)}%</b>
        <span>ACTUAL MASTERY</span>
        <div class="progress-track" style="--p:${progress}%;--tone:${chapter.color}"><i></i></div>
      </div>
    </div>

    <div class="section-title">
      <h2>Topics</h2>
      <span>Step-by-step topic mastery flow</span>
    </div>
    <div class="topic-list">
      ${topics.map((t, i) => `
        <button class="topic-card" data-topic="${t.id}" data-topic-title="${esc(t.title)}">
          <span class="topic-num">${String(i + 1).padStart(2, '0')}</span>
          <span>
            <b>${esc(t.title)}</b>
            <small>${statusLabel(t.status)} · ${Math.round(t.mastery || 0)}% mastery</small>
          </span>
          <span class="state ${t.status === 'MASTERED' ? 'mastered' : t.status === 'LEARNING' ? 'learning' : t.status === 'PRACTICE_REQUIRED' ? 'practice' : t.status === 'REVISION_REQUIRED' ? 'revision' : 'new'}">
            ${statusLabel(t.status).toUpperCase()}
          </span>
          <span class="arrow">›</span>
        </button>
      `).join('')}
    </div>

    <div class="section-title">
      <h2>Chapter resources</h2>
      <button class="text-button" data-modal="resource" data-subject-id="${chapter.subject_id}" data-chapter-id="${chapter.id}">ADD RESOURCE →</button>
    </div>
    ${resources.length ? `
      <div class="resources">
        ${resources.map(r => `
          <div class="resource" style="display:flex;justify-content:space-between;align-items:center">
            <a href="${esc(r.drive_url || r.url || '#')}" target="_blank" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:11px;flex:1">
              <span class="resource-icon">${r.source === 'Telegram' ? '✈' : r.drive_file_id ? '📁' : '▤'}</span>
              <span>
                <b>${esc(r.title)}</b>
                <small>${esc(r.type)}${r.source ? ` · ${esc(r.source)}` : ''}${r.duration_minutes ? ` · ${r.duration_minutes}m` : ''}</small>
              </span>
            </a>
            ${r.drive_url ? `<a href="${esc(r.drive_url)}" target="_blank" class="text-button" style="font-size:11px">Open in Drive</a>` : ''}
          </div>
        `).join('')}
      </div>
    ` : empty('No resources for this chapter yet.', 'Link reference lectures, notes, or NCERT sheets.', `<button class="primary" data-modal="resource" data-subject-id="${chapter.subject_id}" data-chapter-id="${chapter.id}">Add resource</button>`)}
  `;
  setRoute('chapter', `<button class="back" data-subject="${chapter.subject_id}">‹</button><span>${esc(chapter.subject_name)}</span><span>›</span><strong>${esc(chapter.title)}</strong>`);
}

// ----------------------------------------------------
// TOPIC MASTERY FLOW (Learn -> Practice -> Evaluation -> Mastery)
// ----------------------------------------------------
function renderTopic(id, title) {
  const t = chapterDetail.topics.find(x => x.id === id) || { id, title, status: 'NOT_STARTED', mastery: 0 };
  currentTopic = t;
  const c = chapterDetail.chapter;

  $('#topic-view').innerHTML = `
    <p class="eyebrow">${esc(c.subject_name).toUpperCase()} · ${esc(c.title).toUpperCase()}</p>
    <h1>${esc(title)}</h1>
    <p class="subcopy">Follow the 4-step mastery flow. Topics cannot simply be marked complete with a checkbox.</p>

    <div class="learning-layout" style="margin-top:28px">
      <div class="learn-panel">
        <div class="pathway">
          <div class="path-step ${t.status !== 'NOT_STARTED' ? 'done' : 'active'}">
            <div class="path-dot">1</div><span>Learn</span>
          </div>
          <div class="path-step ${['PRACTICE_REQUIRED', 'REVISION_REQUIRED', 'MASTERED'].includes(t.status) ? 'done' : ''}">
            <div class="path-dot">2</div><span>Practice</span>
          </div>
          <div class="path-step ${['REVISION_REQUIRED', 'MASTERED'].includes(t.status) ? 'done' : ''}">
            <div class="path-dot">3</div><span>AI Evaluation</span>
          </div>
          <div class="path-step ${t.status === 'MASTERED' ? 'done' : ''}">
            <div class="path-dot">4</div><span>Mastery</span>
          </div>
        </div>

        <h2>1. Concept &amp; Learning Material</h2>
        <p class="subcopy" style="font-size:12px;margin-bottom:17px">Read the core concept, NCERT derivations, and examples before testing yourself in the practice room.</p>
        
        <div class="learning-card">
          <div class="big-icon">▷</div>
          <div><b>Core Theory &amp; Formulas</b><p>Fundamental laws, definitions, and sign conventions.</p></div>
          <button class="outline" data-topic-status="LEARNING" data-topic-id="${t.id}">Mark Studied</button>
        </div>

        <div class="learning-card">
          <div class="big-icon">▥</div>
          <div><b>NCERT Text &amp; Solved Derivations</b><p>Standard CBSE board derivations and textbook examples.</p></div>
          <button class="outline" data-topic-status="LEARNING" data-topic-id="${t.id}">Studied</button>
        </div>

        <div style="margin-top:24px">
          <button class="primary" data-start-practice="${t.id}">Start Practice · 5–8 CBSE Questions →</button>
        </div>
      </div>

      <aside class="topic-aside">
        <div class="panel next-up">
          <p class="mono">CURRENT STATUS</p>
          <h3>${statusLabel(t.status)}</h3>
          <p>Current mastery: <strong>${Math.round(t.mastery || 0)}%</strong>. Mastery decision is calculated through actual practice evaluation.</p>
          ${t.next_revision_date ? `<div class="revision-chip">📅 Spaced revision: ${dateLabel(t.next_revision_date)}</div>` : ''}
        </div>

        <div class="panel">
          <p class="mono" style="color:var(--muted)">MASTERY THRESHOLDS</p>
          <div class="checklist">
            <div class="check ${t.mastery >= (boot.settings?.mastered_threshold || 90) ? 'complete' : ''}">
              <span>✓</span>90%+ Mastered
            </div>
            <div class="check ${t.mastery >= (boot.settings?.revision_threshold || 70) ? 'complete' : ''}">
              <span>✓</span>70–89% Revision Required
            </div>
            <div class="check ${t.mastery > 0 && t.mastery < 70 ? 'complete' : ''}">
              <span>✓</span>Below 70% Redo Practice
            </div>
          </div>
        </div>
      </aside>
    </div>
  `;
  setRoute('topic', `<button class="back" data-chapter="${c.id}">‹</button><span>${esc(c.subject_name)}</span><span>›</span><strong>${esc(title)}</strong>`);
}

// ----------------------------------------------------
// PRACTICE ROOM (CBSE Questions, MCQs, Numericals)
// ----------------------------------------------------
async function openPractice(topicId) {
  try {
    toast('Loading CBSE Class 11 question bank...');
    practiceData = await api(`/api/practice/questions?topicId=${topicId}`);
    practiceIndex = 0;
    renderPracticeQuestion();
    setRoute('practice', `<button class="back" data-topic="${topicId}">‹</button><span>Practice</span><span>›</span><strong>${esc(practiceData.topic.title)}</strong>`);
  } catch (err) {
    toast(err.message);
  }
}

function renderPracticeQuestion() {
  const q = practiceData.questions[practiceIndex];
  const total = practiceData.questions.length;

  $('#practice-view').innerHTML = `
    <div class="practice-head">
      <div>
        <p class="eyebrow">${esc(practiceData.topic.subject_name).toUpperCase()} · ${esc(practiceData.topic.title).toUpperCase()}</p>
        <h1>Practice Room</h1>
        <p class="question-counter">QUESTION ${practiceIndex + 1} OF ${total} · CBSE CLASS 11</p>
      </div>
      <button class="outline" data-topic="${practiceData.topic.id}" data-topic-title="${esc(practiceData.topic.title)}">Exit practice</button>
    </div>

    <div class="question-card">
      <div class="question-meta">
        <span class="pill">${esc(q.question_type)}</span>
        <span class="marks">${q.marks} MARK${q.marks === 1 ? '' : 'S'}</span>
      </div>
      <div class="question-text">${esc(q.prompt)}</div>

      ${q.options && q.options.length ? `
        <div class="mcq-options" id="mcq-options">
          ${q.options.map((opt, i) => `
            <button class="mcq-option" data-option-index="${i}">
              <span style="width:22px;height:22px;border-radius:50%;border:1px solid #c8cac2;display:grid;place-items:center;font-size:11px">${String.fromCharCode(65 + i)}</span>
              <span>${esc(opt)}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}

      <textarea class="answer-box" id="practice-answer" placeholder="Show your method here. Formula → substitution → calculation → units → final answer."></textarea>
      
      <div class="answer-footer">
        <p>Your step-by-step working is evaluated according to CBSE Class 11 rubrics.</p>
        <button class="primary" id="btn-submit-answer" data-qid="${q.id}">Submit Answer →</button>
      </div>
    </div>

    <div class="practice-nav">
      <button class="outline" id="practice-prev" ${practiceIndex === 0 ? 'disabled' : ''}>← Previous</button>
      <button class="outline" id="practice-next" ${practiceIndex === total - 1 ? 'disabled' : ''}>Next Question →</button>
    </div>

    <div class="practice-tip">
      <b>CBSE Examiner Tip:</b> Always write the relevant formula and given data before calculations. Even if arithmetic fails, CBSE awards method marks.
    </div>
  `;
}

// ----------------------------------------------------
// AI EVALUATION VIEW & NO-FAKE-AI RUBRIC
// ----------------------------------------------------
function renderEvaluation(result, question) {
  const isAI = result.configured === true;

  $('#evaluation-view').innerHTML = `
    <p class="eyebrow">${isAI ? 'AI EVALUATION' : 'CBSE MARKING SCHEME &amp; VERIFICATION'} · ${esc(practiceData.topic.title).toUpperCase()}</p>
    
    ${!isAI ? `
      <div class="ai-unconfigured">
        <b>⚠️ AI evaluation is not configured</b>
        <p>No <code>GEMINI_API_KEY</code> was found in <code>.env</code>. In strict compliance with the system rules, we do not fake random scores. Compare your working against the official CBSE Marking Scheme below and record your verified score.</p>
      </div>
    ` : `
      <div class="result-banner">
        <div class="score-ring"><b>${result.question_score}/${result.max_marks}</b></div>
        <div>
          <p class="eyebrow">${result.overall_percentage >= 80 ? 'STRONG ATTEMPT' : result.overall_percentage >= 60 ? 'MODERATE ATTEMPT' : 'NEEDS PRACTICE'}</p>
          <h2>${result.overall_percentage >= 80 ? 'Solid understanding demonstrated.' : 'Work on step clarity and CBSE presentation.'}</h2>
          <p>${esc(question.question_type)} · ${question.marks} marks</p>
        </div>
      </div>
    `}

    <div class="rubric-box">
      <h3 style="margin:0 0 8px">Official CBSE Model Answer</h3>
      <p style="font-size:13px;line-height:1.6;color:#222;white-space:pre-wrap;background:#fff;padding:14px;border-radius:10px;border:1px solid #ebd998">${esc(result.modelAnswer || question.model_answer || 'Follow standard derivation.')}</p>
      
      <h4 style="margin:14px 0 6px">CBSE Marking Scheme Rubric:</h4>
      <p style="font-size:12px;color:#555;line-height:1.5">${esc(result.markingScheme || question.marking_scheme || '1 mark for formula, 1 mark for substitution, 1 mark for correct calculation and units.')}</p>
      ${result.weakAreaTag ? `<span class="tag tag-priority-high">Key Focus: ${esc(result.weakAreaTag)}</span>` : ''}
    </div>

    ${isAI ? `
      <div class="result-grid">
        <div class="feedback-card">
          <h3>CBSE Rubric Scores</h3>
          <div class="skill-score">
            <div class="row"><span>Concept</span><span>${result.concept_score}/10</span></div>
            <div class="progress-track" style="--p:${result.concept_score * 10}%;--tone:var(--green)"><i></i></div>
          </div>
          <div class="skill-score">
            <div class="row"><span>Method &amp; Formula</span><span>${result.method_score}/10</span></div>
            <div class="progress-track" style="--p:${result.method_score * 10}%;--tone:var(--green)"><i></i></div>
          </div>
          <div class="skill-score">
            <div class="row"><span>Calculation</span><span>${result.calculation_score}/10</span></div>
            <div class="progress-track" style="--p:${result.calculation_score * 10}%;--tone:var(--orange)"><i></i></div>
          </div>
          <div class="skill-score">
            <div class="row"><span>Completeness &amp; Units</span><span>${result.completeness_score}/10</span></div>
            <div class="progress-track" style="--p:${result.completeness_score * 10}%;--tone:var(--orange)"><i></i></div>
          </div>
        </div>

        <div class="feedback-card">
          <h3>Examiner Notes</h3>
          ${result.mistakes && result.mistakes.length ? `
            <ul class="feedback-list">
              ${result.mistakes.map(m => `<li>${esc(m)}</li>`).join('')}
            </ul>
          ` : '<p style="font-size:12px;color:var(--muted)">No major conceptual mistakes detected.</p>'}
          ${result.recommendation ? `<p style="font-size:11px;color:#333;margin-top:12px"><strong>Recommendation:</strong> ${esc(result.recommendation)}</p>` : ''}
        </div>
      </div>
    ` : ''}

    <div class="next-decision" style="margin-top:20px">
      <p class="eyebrow">MASTERY DECISION</p>
      <h3>Record Question Score</h3>
      <p>Enter the score achieved on this question (out of ${question.marks}) to update your topic mastery score.</p>
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">
        <input type="number" id="manual-score-input" min="0" max="${question.marks}" step="0.5" value="${isAI ? result.question_score : question.marks}" style="width:90px;padding:9px;border:1px solid #dadbd5;border-radius:8px;font-size:14px;font-weight:700" />
        <span>/ ${question.marks} marks</span>
        <button class="primary" id="btn-save-score" data-topic-id="${practiceData.topic.id}" data-max="${question.marks}">Record &amp; Update Mastery</button>
      </div>
    </div>
  `;
  setRoute('evaluation');
}

// ----------------------------------------------------
// EXAMS VIEW
// ----------------------------------------------------
function renderExams() {
  $('#exams-view').innerHTML = `
    <div class="section-title" style="margin-top:0">
      <div>
        <p class="eyebrow">EXAM SCHEDULE</p>
        <h1>Exams</h1>
        <p class="subcopy">Exam dates significantly increase the priority of relevant topics in the daily planner.</p>
      </div>
      <button class="primary" data-modal="exam">+ Add Exam</button>
    </div>

    ${boot.exams.length ? `
      <div class="task-list">
        ${boot.exams.map(e => `
          <div class="exam-card">
            <div>
              <b style="font-size:15px">${esc(e.name)}</b>
              <small style="color:var(--muted);margin-top:4px">
                ${esc(e.subject_name || 'All Subjects')} · Date: ${dateLabel(e.exam_date)} · 
                <strong style="color:${e.days_remaining <= 7 ? 'var(--red)' : 'var(--ink)'}">${e.days_remaining < 0 ? 'Completed' : `${e.days_remaining} days remaining`}</strong>
              </small>
              ${e.syllabus_notes ? `<small style="display:block;margin-top:4px">Syllabus: <em>${esc(e.syllabus_notes)}</em></small>` : ''}
            </div>
            <button class="danger" data-delete-exam="${e.id}">Remove</button>
          </div>
        `).join('')}
      </div>
    ` : empty('No exams scheduled.', 'Add your upcoming tests or unit exams.', '<button class="primary" data-modal="exam">+ Add Exam</button>')}
  `;
  setRoute('exams');
}

// ----------------------------------------------------
// SETTINGS & INTEGRATIONS
// ----------------------------------------------------
function renderSettings() {
  const s = boot.settings || { mastered_threshold: 90, revision_threshold: 70 };
  const sc = boot.schedule || {};

  $('#settings-view').innerHTML = `
    <p class="eyebrow">CONFIGURATION</p>
    <h1>Settings</h1>
    <p class="subcopy">Adjust mastery thresholds, daily commitments, and external service credentials.</p>

    <!-- Thresholds -->
    <div class="panel" style="max-width:760px;margin-bottom:18px">
      <h3 style="margin-top:0">Topic Mastery Thresholds</h3>
      <p style="font-size:12px;color:var(--muted);margin-bottom:16px">Configurable scores required to move topics between states.</p>
      
      <form id="form-settings-thresholds" class="form-grid">
        <div class="field">
          <label>Mastered Threshold (%)</label>
          <input type="number" name="masteredThreshold" min="50" max="100" value="${s.mastered_threshold}" required />
          <small style="color:var(--muted);font-size:10px">Default: 90%+. Triggers spaced revision in 7 days.</small>
        </div>
        <div class="field">
          <label>Revision Required Threshold (%)</label>
          <input type="number" name="revisionThreshold" min="30" max="90" value="${s.revision_threshold}" required />
          <small style="color:var(--muted);font-size:10px">Default: 70–89%. Below this marks topic for redo.</small>
        </div>
        <div class="field full">
          <button class="primary" style="width:fit-content">Save Thresholds</button>
        </div>
      </form>
    </div>

    <!-- Integrations Overview -->
    <div class="panel" style="max-width:760px;margin-bottom:18px">
      <h3 style="margin-top:0">Connected Integrations</h3>
      
      <div class="source-status">
        <div>
          <b>Telegram Content Importer</b>
          <small style="display:block;color:var(--muted);font-size:11px;margin-top:3px">Authorized MTProto user flow. Scans study channels for PDFs, notes &amp; documents.</small>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="tag ${boot.telegramStatus?.connected ? 'tag-study' : 'tag-priority-med'}">${boot.telegramStatus?.connected ? 'CONNECTED' : 'NOT CONNECTED'}</span>
          <button class="outline" data-modal="telegram-sync" style="font-size:11px">Configure</button>
        </div>
      </div>

      <div class="source-status">
        <div>
          <b>Spotify Web Player</b>
          <small style="display:block;color:var(--muted);font-size:11px;margin-top:3px">OAuth playback control, study playlists &amp; live music search.</small>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="tag ${boot.spotifyStatus?.connected ? 'tag-study' : 'tag-priority-med'}">${boot.spotifyStatus?.connected ? 'CONNECTED' : 'NOT CONNECTED'}</span>
          <button class="outline" data-modal="spotify-player" style="font-size:11px">Configure</button>
        </div>
      </div>

      <div class="source-status">
        <div>
          <b>Google Drive Storage</b>
          <small style="display:block;color:var(--muted);font-size:11px;margin-top:3px">Direct metadata linking and viewing for large study files and videos.</small>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="tag ${boot.driveStatus?.connected ? 'tag-study' : 'tag-priority-low'}">${boot.driveStatus?.connected ? 'CONNECTED' : 'METADATA LINKED'}</span>
        </div>
      </div>

      <div class="source-status">
        <div>
          <b>Gemini AI Answer Evaluator</b>
          <small style="display:block;color:var(--muted);font-size:11px;margin-top:3px">Evaluates CBSE step-by-step methods, units, calculations, and weak areas.</small>
        </div>
        <span class="tag ${boot.aiConfigured ? 'tag-study' : 'tag-priority-med'}">${boot.aiConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}</span>
      </div>
    </div>

    <!-- Daily Rhythm & Sleep Schedule -->
    <div class="panel" style="max-width:760px">
      <h3 style="margin-top:0">Daily Rhythm &amp; Sleep</h3>
      <p style="font-size:12px;color:var(--muted);margin-bottom:16px">Study planner respects school, tuition and guarantees 7.5h sleep.</p>
      
      <form id="form-settings-schedule" class="form-grid">
        <div class="field"><label>School Starts</label><input type="time" name="schoolStart" value="${sc.school_start || '07:30'}" /></div>
        <div class="field"><label>School Ends</label><input type="time" name="schoolEnd" value="${sc.school_end || '14:30'}" /></div>
        <div class="field"><label>Tuition Starts</label><input type="time" name="tuitionStart" value="${sc.tuition_start || '16:00'}" /></div>
        <div class="field"><label>Tuition Ends</label><input type="time" name="tuitionEnd" value="${sc.tuition_end || '18:00'}" /></div>
        <div class="field"><label>Available Study Minutes / Day</label><input type="number" name="availableMinutes" value="${sc.available_minutes || 120}" /></div>
        <div class="field"><label>Preferred Session</label>
          <select name="preferredSession">
            <option ${sc.preferred_session === 'Morning' ? 'selected' : ''}>Morning</option>
            <option ${sc.preferred_session === 'Evening' ? 'selected' : ''}>Evening</option>
            <option ${sc.preferred_session === 'Night' ? 'selected' : ''}>Night</option>
          </select>
        </div>
        <div class="field"><label>Sleep Starts</label><input type="time" name="sleepStart" value="${sc.sleep_start || '23:00'}" /></div>
        <div class="field"><label>Sleep Ends</label><input type="time" name="sleepEnd" value="${sc.sleep_end || '06:30'}" /></div>
        <div class="field full">
          <button class="primary" style="width:fit-content">Save Schedule</button>
        </div>
      </form>
    </div>
  `;
  setRoute('settings');
}

// ----------------------------------------------------
// CLAT VIEW
// ----------------------------------------------------
function renderClat() {
  $('#clat-view').innerHTML = `
    <p class="eyebrow">SECONDARY TRACK</p>
    <h1>CLAT</h1>
    <p class="subcopy">CLAT remains secondary to Class 11 core academics. The planner reserves 20–45 minutes only during lighter Class 11 periods.</p>
    <div class="panel" style="max-width:760px">
      <h3>Active Policy: Class 11 First</h3>
      <p style="font-size:12px;color:var(--muted);line-height:1.6">Whenever urgent exams or high-priority Class 11 backlog exist, CLAT tasks are held back. When capacity frees up, short 25-minute reading and reasoning drills are suggested.</p>
      <button class="primary" data-route="plan">View Today's Study Plan</button>
    </div>
  `;
  setRoute('clat');
}

// ----------------------------------------------------
// MODALS (School Work, Telegram, Spotify, Import Review, etc.)
// ----------------------------------------------------
async function openModal(kind, attrs = {}) {
  const layer = document.createElement('div');
  layer.className = 'modal-layer';
  const subjectOptions = boot.subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');

  if (kind === 'school-work') {
    layer.innerHTML = `
      <form class="modal" id="form-add-school-work">
        <div class="modal-top">
          <div><p class="eyebrow">SCHOOL NOTEBOOK SYSTEM</p><h2>+ Add School Work</h2></div>
          <button type="button" class="close" data-close>×</button>
        </div>
        <div class="form-grid">
          <div class="field"><label>Subject</label><select name="subjectId" id="sw-subject">${subjectOptions}</select></div>
          <div class="field"><label>Work Type</label>
            <select name="workType">
              ${['Classwork','Homework','Notes','Numericals','Derivations','Diagrams','Assignment','Practical','Project','Correction','Other'].map(t => `<option>${t}</option>`).join('')}
            </select>
          </div>
          <div class="field full"><label>Work Description</label><input required name="description" placeholder="e.g. Physics Laws of Motion NCERT Exercise numericals Q1–Q15" /></div>
          <div class="field"><label>Estimated Duration (min)</label><input type="number" min="15" name="estimatedMinutes" value="45" /></div>
          <div class="field"><label>Due Date</label><input type="date" name="dueDate" value="${new Date(Date.now() + 86400000).toISOString().split('T')[0]}" /></div>
          <div class="field"><label>Priority</label>
            <select name="priority">
              <option>HIGH</option><option selected>MEDIUM</option><option>LOW</option>
            </select>
          </div>
          <div class="field"><label>Teacher Name (optional)</label><input name="teacher" placeholder="e.g. Verma Sir" /></div>
          <div class="field full"><label>Remarks / Instructions</label><textarea name="remarks" placeholder="e.g. Draw free body diagrams with scale and label units."></textarea></div>
          <div class="field full"><label>Attachment Reference (optional)</label><input type="url" name="attachment" placeholder="https://..." /></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="outline" data-close>Cancel</button>
          <button class="primary">Save School Work</button>
        </div>
      </form>
    `;
  } else if (kind === 'telegram-sync') {
    const tgStatus = await api('/api/integrations/telegram/status');
    const reviewItems = await api('/api/integrations/telegram/review');

    layer.innerHTML = `
      <div class="modal" style="width:min(720px, 100%)">
        <div class="modal-top">
          <div><p class="eyebrow">TELEGRAM CONTENT IMPORTER</p><h2>Telegram Integration</h2></div>
          <button type="button" class="close" data-close>×</button>
        </div>

        ${!tgStatus.connected ? `
          <div class="panel" style="margin-bottom:18px">
            <h4 style="margin-top:0">Step-by-Step Telegram Authentication</h4>
            <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Authenticate your Telegram account to import PDFs, study notes, and assignment sheets from your channels.</p>
            <div id="tg-step-1">
              <div class="field">
                <label>Phone Number (with Country Code)</label>
                <input type="tel" id="tg-input-phone" placeholder="e.g. +919876543210" style="padding:10px" />
              </div>
              <button type="button" class="primary" id="btn-tg-send-otp">Send Verification Code →</button>
            </div>
            <div id="tg-step-2" style="display:none;margin-top:14px">
              <div style="background:#e8f4fd;border:1.5px solid #b6dcfb;border-radius:12px;padding:14px;margin-bottom:14px;font-size:12px;color:#184269;line-height:1.55">
                <strong style="display:block;font-size:13px;margin-bottom:4px">💬 Check your Telegram App!</strong>
                Telegram delivers the login code directly inside the <strong>official Telegram app</strong> (look for the chat from <strong>Telegram</strong>), NOT SMS. Open Telegram on your phone or desktop to copy the 5-digit code!
              </div>
              <div class="field">
                <label>Verification Code (From Telegram App Chat)</label>
                <input type="text" id="tg-input-code" placeholder="Enter 5-digit code (e.g. 84920)" style="padding:10px;font-size:14px;letter-spacing:2px" />
              </div>
              <div class="field" id="tg-2fa-field">
                <label>2FA Password (Only if 2-Step Verification is active)</label>
                <input type="password" id="tg-input-password" placeholder="Leave blank if 2FA is disabled" style="padding:10px" />
              </div>
              <div style="display:flex;gap:8px">
                <button type="button" class="primary" id="btn-tg-verify-otp">Verify &amp; Connect →</button>
                <button type="button" class="outline" id="btn-tg-back-otp">Change Phone / Resend</button>
              </div>
            </div>
          </div>
        ` : `
          <div class="panel" style="margin-bottom:18px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <strong style="font-size:15px">Connected: ${esc(tgStatus.account?.firstName || 'User')} (@${esc(tgStatus.account?.username || 'user')})</strong>
                <small style="display:block;color:var(--muted);margin-top:3px">Phone: ${esc(tgStatus.account?.phone || '')}</small>
              </div>
              <button class="danger" id="btn-tg-disconnect">Disconnect</button>
            </div>
          </div>
        `}

        ${tgStatus.connected ? `
          <div style="display:flex;gap:10px;margin-bottom:20px">
            <button class="primary" id="btn-tg-scan">Scan Selected Channels Now</button>
            <button class="outline" id="btn-tg-load-sources">Manage Monitored Sources</button>
          </div>

          <div class="section-title" style="margin-top:20px">
            <h3>Import Review (${reviewItems.length} items awaiting review)</h3>
          </div>
          ${reviewItems.length ? `
            <div style="max-height:360px;overflow-y:auto;padding-right:4px">
              ${reviewItems.map(item => `
                <div class="review-item-card" data-item-id="${item.id}">
                  <div>
                    <strong style="font-size:13px">${esc(item.file_name)}</strong>
                    <div style="display:flex;gap:7px;align-items:center;margin:4px 0">
                      <span class="tag tag-school">${esc(item.resource_type)}</span>
                      <span style="font-size:11px;color:var(--muted)">Suggested: <strong>${esc(item.suggested_subject_name || 'Physics')}</strong></span>
                      ${item.source_ref ? `<a href="${esc(item.source_ref)}" target="_blank" style="font-size:11px;color:var(--green)">Open in Telegram</a>` : ''}
                    </div>
                    <div class="review-inputs">
                      <select class="rev-subj">${subjectOptions}</select>
                      <input class="rev-title" value="${esc(item.file_name)}" placeholder="Resource Title" />
                      <select class="rev-type">
                        <option selected>Notes</option><option>NCERT</option><option>Question Sheet</option><option>Test</option><option>Lecture</option>
                      </select>
                    </div>
                  </div>
                  <div class="page-actions" style="flex-direction:column;gap:6px">
                    <button class="primary" style="font-size:11px;padding:6px 10px" data-approve-review="${item.id}">Approve</button>
                    <button class="danger" style="font-size:11px" data-discard-review="${item.id}">Discard</button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : empty('No items in Import Review.', 'Click "Scan Selected Channels Now" to check for new study materials.')}
        ` : ''}
      </div>
    `;
  } else if (kind === 'spotify-player') {
    const spStatus = await api('/api/integrations/spotify/status');
    let playlists = [];
    if (spStatus.connected) {
      try { playlists = await api('/api/integrations/spotify/playlists'); } catch (_) {}
    }

    layer.innerHTML = `
      <div class="modal" style="width:min(720px, 100%)">
        <div class="modal-top">
          <div><p class="eyebrow">SPOTIFY STUDY MUSIC</p><h2>Spotify Music &amp; Playlists</h2></div>
          <button type="button" class="close" data-close>×</button>
        </div>

        <div class="category-tabs" style="margin-bottom:16px">
          <button type="button" class="cat-tab active" data-tab-target="#tab-study-player">🎧 Study Music Player</button>
          <button type="button" class="cat-tab" data-tab-target="#tab-spotify-oauth">🔗 Personal Account (${spStatus.connected ? 'Connected' : 'Configure'})</button>
        </div>

        <!-- TAB 1: Instant Study Music Embed Player (No Keys Required) -->
        <div id="tab-study-player" class="sp-tab-content">
          <div style="display:flex;gap:8px;margin-bottom:12px;overflow-x:auto;padding-bottom:4px">
            <button type="button" class="cat-tab active embed-pill" data-switch-embed="37i9dQZF1DX8Uebhn9wzrS">🎧 Lofi Study</button>
            <button type="button" class="cat-tab embed-pill" data-switch-embed="37i9dQZF1DWZeKCadgRdKQ">🧠 Deep Focus</button>
            <button type="button" class="cat-tab embed-pill" data-switch-embed="37i9dQZF1DX4sWSpwq3LiO">🎹 Peaceful Piano</button>
            <button type="button" class="cat-tab embed-pill" data-switch-embed="37i9dQZF1DXdLEN7aqioXM">🎻 Classical Study</button>
          </div>
          <div style="border-radius:14px;overflow:hidden;background:#121212;box-shadow:0 8px 30px rgba(0,0,0,0.3)">
            <iframe id="spotify-embed-frame" style="border-radius:12px;display:block" src="https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS?utm_source=generator&theme=0" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
          </div>
          <p style="font-size:11px;color:var(--muted);margin:8px 0 0">Official Spotify study stream. Plays instantly in the browser without requiring developer API keys.</p>
        </div>

        <!-- TAB 2: Official Account OAuth Flow -->
        <div id="tab-spotify-oauth" class="sp-tab-content" style="display:none">
          ${spStatus.connected ? `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid var(--line)">
              <div>
                <strong>Connected: ${esc(spStatus.displayName || 'Spotify User')}</strong>
                <small style="display:block;color:var(--muted)">Official Web API connection (${esc(spStatus.product || 'Standard')})</small>
              </div>
              <button class="danger" id="btn-disconnect-spotify">Disconnect</button>
            </div>

            <!-- Live Search Box -->
            <div class="field full">
              <label>Search Spotify Tracks / Artists / Playlists</label>
              <div style="display:flex;gap:8px">
                <input type="text" id="spotify-search-query" placeholder="e.g. Lofi study beats, Mozart, Ludovico Einaudi" />
                <button class="primary" id="btn-do-spotify-search">Search</button>
              </div>
            </div>
            <div id="spotify-search-results" style="margin-top:12px"></div>

            <div class="section-title" style="margin-top:20px">
              <h3>Your Playlists (${playlists.length})</h3>
            </div>
            ${playlists.length ? `
              <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:12px;max-height:260px;overflow-y:auto">
                ${playlists.map(p => `
                  <div class="panel" style="padding:12px;cursor:pointer" data-play-spotify-uri="${esc(p.uri)}">
                    ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px" />` : ''}
                    <strong style="font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</strong>
                    <small style="color:var(--muted)">${p.tracksCount} tracks</small>
                  </div>
                `).join('')}
              </div>
            ` : '<p style="font-size:12px;color:var(--muted)">No playlists found in your Spotify library.</p>'}
          ` : `
            <div class="panel" style="margin-bottom:18px">
              <h4>Authorize Personal Spotify Account</h4>
              <p style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:14px">Connect your personal Spotify library to browse your saved playlists and control playback.</p>

              ${spStatus.configured ? `
                <div style="text-align:center;padding:16px 0">
                  <button class="primary" id="btn-connect-spotify" style="font-size:13px;padding:12px 20px">Connect via Spotify OAuth →</button>
                  <p style="font-size:11px;color:var(--muted);margin-top:8px">Redirects to official Spotify login to authorize access.</p>
                </div>
              ` : `
                <div id="spotify-config-box" style="background:#fff;border:1px solid #e2e4dc;border-radius:12px;padding:16px">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                    <span style="font-size:18px">⚙️</span>
                    <strong>Enter Spotify Developer Credentials</strong>
                  </div>
                  <div class="field">
                    <label>Spotify Client ID</label>
                    <input type="text" id="spotify-input-client-id" placeholder="Paste your 32-character Client ID" />
                  </div>
                  <div class="field">
                    <label>Spotify Client Secret</label>
                    <input type="password" id="spotify-input-client-secret" placeholder="Paste your Client Secret" />
                  </div>
                  <div style="margin-top:14px">
                    <button type="button" class="primary" id="btn-save-spotify-creds">Save &amp; Authorize via Spotify →</button>
                  </div>
                  <div style="background:#f7f7f4;border-radius:8px;padding:10px;margin-top:14px;font-size:11px;color:#555;line-height:1.6">
                    <b>How to get your free credentials in 1 minute:</b><br/>
                    1. Go to <a href="https://developer.spotify.com/dashboard" target="_blank" style="color:var(--green);font-weight:700">developer.spotify.com/dashboard</a> and log in.<br/>
                    2. Click <strong>Create App</strong> (App Name: <em>Study OS</em>).<br/>
                    3. Under <strong>Redirect URIs</strong>, add: <code style="background:#eaeaea;padding:2px 5px;border-radius:4px">http://localhost:4173/api/integrations/spotify/callback</code><br/>
                    4. Click <strong>Settings</strong> to copy your Client ID and Client Secret, then paste above.
                  </div>
                </div>
              `}
            </div>
          `}
        </div>
      </div>
    `;
  } else if (kind === 'daily-work') {
    layer.innerHTML = `
      <form class="modal" id="form-daily-work">
        <div class="modal-top">
          <div><p class="eyebrow">DAILY WORK / HOMEWORK</p><h2>Add Task / Homework</h2></div>
          <button type="button" class="close" data-close>×</button>
        </div>
        <div class="form-grid">
          <div class="field full"><label>Task Title</label><input required name="title" placeholder="e.g. Complete NCERT exercise 3.1, Q1–Q10"></div>
          <div class="field"><label>Category / Source</label>
            <select name="category">
              <option value="SCHOOL">🏫 School</option>
              <option value="TUITION">👨🏫 Tuition</option>
              <option value="NOTEBOOK">📚 Notebook</option>
              <option value="HOMEWORK">📝 Homework</option>
              <option value="SELF_STUDY">🎯 Self Study</option>
              <option value="REVISION">🔁 Revision</option>
              <option value="CLAT">⚖️ CLAT</option>
            </select>
          </div>
          <div class="field"><label>Subject</label><select name="subjectId" id="modal-sub-select">${subjectOptions}</select></div>
          <div class="field"><label>Due Date</label><input type="date" name="dueDate" value="${new Date(Date.now() + 86400000).toISOString().split('T')[0]}" /></div>
          <div class="field"><label>Estimated Duration (min)</label><input type="number" min="10" name="duration" value="30" /></div>
          <div class="field"><label>Priority</label>
            <select name="priority">
              <option>HIGH</option><option selected>MEDIUM</option><option>LOW</option>
            </select>
          </div>
          <div class="field"><label>Optional Attachment / Link</label><input type="url" name="attachment" placeholder="https://..." /></div>
          <div class="field full"><label>Remarks / Teacher Notes</label><textarea name="remarks" placeholder="e.g. Sir said numericals 5–12 are test questions."></textarea></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="outline" data-close>Cancel</button>
          <button class="primary">Save Task</button>
        </div>
      </form>
    `;
  } else if (kind === 'teacher-topic') {
    layer.innerHTML = `
      <form class="modal" id="form-teacher-topic">
        <div class="modal-top">
          <div><p class="eyebrow">TEACHER IMPORTANT TOPIC</p><h2>Add Important Topic</h2></div>
          <button type="button" class="close" data-close>×</button>
        </div>
        <div class="form-grid">
          <div class="field"><label>Subject</label><select name="subjectId" id="tt-subject">${subjectOptions}</select></div>
          <div class="field"><label>Topic / Chapter Name</label><input required name="topicName" placeholder="e.g. Friction, VSEPR Theory, Rotational Motion" /></div>
          <div class="field"><label>Expected Marks</label><input type="number" name="expectedMarks" value="5" min="1" max="15" /></div>
          <div class="field"><label>Importance</label>
            <select name="importance">
              <option selected>HIGH</option><option>MEDIUM</option><option>LOW</option>
            </select>
          </div>
          <div class="field"><label>Target Exam</label><input name="examName" placeholder="e.g. Unit Test, Half Yearly" /></div>
          <div class="field"><label>Teacher Name (optional)</label><input name="teacherName" placeholder="e.g. Physics Sir" /></div>
          <div class="field full"><label>Remarks</label><textarea name="remarks" placeholder="e.g. Sir emphasized 5-mark numericals from this topic."></textarea></div>
        </div>
        <p style="font-size:11px;color:var(--muted);margin:8px 0 0">Saving this will immediately recalculate your study priorities and elevate this topic.</p>
        <div class="modal-footer">
          <button type="button" class="outline" data-close>Cancel</button>
          <button class="primary">Save &amp; Recalculate</button>
        </div>
      </form>
    `;
  } else if (kind === 'edit-backlog') {
    const b = boot.backlog.find(x => x.id === Number(attrs.backlogId));
    if (!b) return;

    layer.innerHTML = `
      <form class="modal" id="form-edit-backlog" data-id="${b.id}">
        <div class="modal-top">
          <div><p class="eyebrow">EDIT BACKLOG ITEM</p><h2>${esc(b.title || b.topic_title || b.chapter_title)}</h2></div>
          <button type="button" class="close" data-close>×</button>
        </div>
        <div class="form-grid">
          <div class="field full"><label>Title</label><input name="title" value="${esc(b.title || b.topic_title || b.chapter_title)}" required /></div>
          <div class="field"><label>Priority</label>
            <select name="priority">
              <option ${b.priority === 'HIGH' ? 'selected' : ''}>HIGH</option>
              <option ${b.priority === 'MEDIUM' ? 'selected' : ''}>MEDIUM</option>
              <option ${b.priority === 'LOW' ? 'selected' : ''}>LOW</option>
            </select>
          </div>
          <div class="field"><label>Estimated Minutes</label><input type="number" name="minutes" value="${b.estimated_minutes}" min="15" /></div>
          <div class="field full"><label>Reason / Goal</label><textarea name="reason">${esc(b.reason || '')}</textarea></div>
          <div class="field"><label>Status</label>
            <select name="status">
              <option value="OPEN" ${b.status === 'OPEN' ? 'selected' : ''}>OPEN</option>
              <option value="IN_PROGRESS" ${b.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
              <option value="DONE" ${b.status === 'DONE' ? 'selected' : ''}>DONE (Mastered / Archived)</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="outline" data-close>Cancel</button>
          <button class="primary">Update Item</button>
        </div>
      </form>
    `;
  } else if (kind === 'exam') {
    layer.innerHTML = `
      <form class="modal" id="form-exam">
        <div class="modal-top">
          <div><p class="eyebrow">EXAM SYSTEM</p><h2>Add Exam</h2></div>
          <button type="button" class="close" data-close>×</button>
        </div>
        <div class="form-grid">
          <div class="field"><label>Subject</label><select name="subjectId">${subjectOptions}</select></div>
          <div class="field"><label>Exam Date</label><input required type="date" name="date" /></div>
          <div class="field full"><label>Exam Name</label><input required name="name" placeholder="e.g. Chemistry Unit Test" /></div>
          <div class="field full"><label>Syllabus Notes / Chapters</label><textarea name="syllabus" placeholder="e.g. Equilibrium & Redox Reactions"></textarea></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="outline" data-close>Cancel</button>
          <button class="primary">Save Exam</button>
        </div>
      </form>
    `;
  } else if (kind === 'backlog') {
    layer.innerHTML = `
      <form class="modal" id="form-backlog">
        <div class="modal-top">
          <div><p class="eyebrow">BACKLOG SYSTEM</p><h2>Add Backlog Item</h2></div>
          <button type="button" class="close" data-close>×</button>
        </div>
        <div class="form-grid">
          <div class="field"><label>Subject</label><select name="subjectId">${subjectOptions}</select></div>
          <div class="field"><label>Estimated Minutes</label><input required type="number" min="15" value="45" name="minutes" /></div>
          <div class="field full"><label>Topic / Chapter Title</label><input required name="title" placeholder="e.g. Trigonometric Equations" /></div>
          <div class="field"><label>Priority</label>
            <select name="priority">
              <option>HIGH</option><option selected>MEDIUM</option><option>LOW</option>
            </select>
          </div>
          <div class="field full"><label>Reason</label><textarea name="reason" placeholder="Why is this incomplete?"></textarea></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="outline" data-close>Cancel</button>
          <button class="primary">Add Backlog Item</button>
        </div>
      </form>
    `;
  } else if (kind === 'resource') {
    layer.innerHTML = `
      <form class="modal" id="form-resource">
        <div class="modal-top">
          <div><p class="eyebrow">RESOURCES</p><h2>Add Resource</h2></div>
          <button type="button" class="close" data-close>×</button>
        </div>
        <div class="form-grid">
          <div class="field full"><label>Title</label><input required name="title" placeholder="e.g. Kinematics NCERT Examples" /></div>
          <div class="field"><label>Type</label>
            <select name="type">
              ${['Lecture', 'Notes', 'NCERT', 'Question Sheet', 'Test', 'PYQ', 'Revision', 'Other'].map(x => `<option>${x}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Duration (min)</label><input type="number" min="0" name="duration" /></div>
          <div class="field"><label>Source</label><input name="source" placeholder="YouTube / Notes / Drive / Telegram" /></div>
          <div class="field full"><label>URL or Reference</label><input type="url" name="url" placeholder="https://..." /></div>
          <div class="field full"><label>Google Drive URL / ID (optional)</label><input name="driveUrl" placeholder="https://drive.google.com/..." /></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="outline" data-close>Cancel</button>
          <button class="primary">Add Resource</button>
        </div>
      </form>
    `;
  }
  document.body.append(layer);
}

// ----------------------------------------------------
// EVENT LISTENERS & DELEGATION
// ----------------------------------------------------
document.addEventListener('click', async e => {
  const b = e.target.closest('button, a');
  if (!b) return;

  try {
    // Navigation
    if (b.dataset.route) {
      ({
        home: renderHome,
        'daily-work': renderDailyWork,
        notebooks: renderNotebooks,
        'teacher-topics': renderTeacherTopics,
        plan: renderPlan,
        exams: renderExams,
        backlog: renderBacklog,
        settings: renderSettings,
        clat: renderClat
      }[b.dataset.route] || renderHome)();
      return;
    }

    if (b.dataset.subject) { renderSubject(b.dataset.subject); return; }
    if (b.dataset.chapter) { renderChapter(b.dataset.chapter); return; }
    if (b.dataset.firstChapter) { renderChapter(b.dataset.firstChapter); return; }
    if (b.dataset.topic) { renderTopic(Number(b.dataset.topic), b.dataset.topicTitle); return; }

    // Category Tabs
    if (b.dataset.workCat) {
      dailyWorkCategory = b.dataset.workCat;
      renderDailyWork();
      return;
    }

    if (b.dataset.backlogFilter) {
      backlogFilter = b.dataset.backlogFilter;
      renderBacklog();
      return;
    }

    if (b.dataset.notebookFilter) {
      notebookFilter = b.dataset.notebookFilter;
      renderNotebooks();
      return;
    }

    // School Work / Notebook Actions
    if (b.dataset.toggleNotebook) {
      const id = Number(b.dataset.toggleNotebook);
      const isDone = b.textContent.includes('✓');
      await api(`/api/school-work/${id}`, { method: 'PATCH', body: JSON.stringify({ status: isDone ? 'IN_PROGRESS' : 'COMPLETED' }) });
      await refresh();
      renderNotebooks();
      toast(isDone ? 'Marked in progress.' : 'Notebook work marked completed.');
      return;
    }

    if (b.dataset.deleteNotebook) {
      await api(`/api/school-work/${b.dataset.deleteNotebook}`, { method: 'DELETE' });
      await refresh();
      renderNotebooks();
      toast('School work item removed.');
      return;
    }

    // Daily Work Checkbox Actions
    if (b.dataset.toggleWork) {
      const w = boot.dailyWork.find(x => x.id === Number(b.dataset.toggleWork));
      if (w) {
        const nextStatus = w.status === 'DONE' ? 'OPEN' : 'DONE';
        await api(`/api/daily-work/${w.id}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
        await refresh();
        if ($('#daily-work-view').classList.contains('active')) renderDailyWork();
        else renderHome();
        toast(nextStatus === 'DONE' ? 'Homework marked completed.' : 'Homework reopened.');
      }
      return;
    }

    if (b.dataset.deleteWork) {
      await api(`/api/daily-work/${b.dataset.deleteWork}`, { method: 'DELETE' });
      await refresh();
      renderDailyWork();
      toast('Task deleted.');
      return;
    }

    // Teacher Topic Actions
    if (b.dataset.deleteTeacherTopic) {
      await api(`/api/teacher-topics/${b.dataset.deleteTeacherTopic}`, { method: 'DELETE' });
      await refresh();
      renderTeacherTopics();
      toast('Teacher topic removed & priorities recalculated.');
      return;
    }

    // Study Plan Actions
    if (b.dataset.generatePlan) {
      const selDay = $('#day-type-select')?.value || 'NORMAL_SCHOOL_DAY';
      await api('/api/tasks/generate', { method: 'POST', body: JSON.stringify({ dayType: selDay }) });
      await refresh();
      renderPlan();
      toast('Study plan recalculated from priorities.');
      return;
    }

    if (b.dataset.toggleTask) {
      const t = boot.tasks.find(x => x.id === Number(b.dataset.toggleTask));
      if (t) {
        const nextStatus = t.status === 'DONE' ? 'OPEN' : 'DONE';
        await api(`/api/tasks/${t.id}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
        await refresh();
        renderPlan();
      }
      return;
    }

    // Backlog Actions
    if (b.dataset.startBacklog) {
      const bItem = boot.backlog.find(x => x.id === Number(b.dataset.startBacklog));
      if (bItem) {
        await api(`/api/backlog/${bItem.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS' }) });
        if (bItem.chapter_id) await renderChapter(bItem.chapter_id);
        else if (bItem.subject_id) await renderSubject(bItem.subject_id);
      }
      return;
    }

    if (b.dataset.editBacklog) {
      openModal('edit-backlog', { backlogId: b.dataset.editBacklog });
      return;
    }

    if (b.dataset.reopenBacklog) {
      await api(`/api/backlog/${b.dataset.reopenBacklog}`, { method: 'PATCH', body: JSON.stringify({ status: 'OPEN' }) });
      await refresh();
      renderBacklog();
      toast('Backlog item reopened.');
      return;
    }

    if (b.dataset.deleteBacklog) {
      await api(`/api/backlog/${b.dataset.deleteBacklog}`, { method: 'DELETE' });
      await refresh();
      renderBacklog();
      toast('Backlog item removed.');
      return;
    }

    // Practice Flow Actions
    if (b.dataset.startPractice) {
      openPractice(Number(b.dataset.startPractice));
      return;
    }

    if (b.id === 'practice-prev') {
      if (practiceIndex > 0) { practiceIndex--; renderPracticeQuestion(); }
      return;
    }

    if (b.id === 'practice-next') {
      if (practiceIndex < practiceData.questions.length - 1) { practiceIndex++; renderPracticeQuestion(); }
      return;
    }

    if (b.dataset.optionIndex !== undefined) {
      $$('.mcq-option').forEach(opt => opt.classList.remove('selected'));
      b.classList.add('selected');
      const letter = String.fromCharCode(65 + Number(b.dataset.optionIndex));
      $('#practice-answer').value = `Selected Option: ${letter} - ${b.textContent.trim().slice(1).trim()}`;
      return;
    }

    if (b.id === 'btn-submit-answer') {
      const qid = Number(b.dataset.qid);
      const answer = $('#practice-answer')?.value.trim();
      if (!answer) {
        toast('Please enter your working or select an option first.');
        return;
      }
      toast('Evaluating answer according to CBSE standards...');
      const evalRes = await api('/api/practice/submit', { method: 'POST', body: JSON.stringify({ questionId: qid, answer }) });
      renderEvaluation(evalRes, practiceData.questions[practiceIndex]);
      return;
    }

    if (b.id === 'btn-save-score') {
      const topicId = Number(b.dataset.topicId);
      const score = Number($('#manual-score-input')?.value || 0);
      const maxScore = Number(b.dataset.max || 10);
      const res = await api('/api/practice/record-score', { method: 'POST', body: JSON.stringify({ topicId, score, maxScore }) });
      await refresh();
      toast(`Mastery updated: ${res.percentage}% (${res.status})`);
      if (chapterDetail) await renderChapter(chapterDetail.chapter.id);
      else renderHome();
      return;
    }

    // Spotify Actions
    if (b.dataset.spotifyAction) {
      const action = b.dataset.spotifyAction;
      const res = await api('/api/integrations/spotify/player/action', { method: 'POST', body: JSON.stringify({ action }) });
      if (res.fallback && res.webUrl) {
        toast(res.message);
        window.open(res.webUrl, '_blank');
      } else {
        updateSpotifyDock();
      }
      return;
    }

    if (b.dataset.playSpotifyUri) {
      const uri = b.dataset.playSpotifyUri;
      const res = await api('/api/integrations/spotify/player/action', { method: 'POST', body: JSON.stringify({ action: 'play', uri }) });
      if (res.fallback && res.webUrl) {
        toast(res.message);
        window.open(res.webUrl, '_blank');
      } else {
        toast('Playback started on Spotify device.');
        updateSpotifyDock();
      }
      return;
    }

    if (b.id === 'btn-spotify-search') {
      openModal('spotify-player');
      return;
    }

    if (b.id === 'btn-connect-spotify') {
      try {
        const res = await api('/api/integrations/spotify/auth-url');
        if (res.url) {
          window.location.href = res.url;
        } else {
          toast(res.error || 'Please configure Spotify Client ID & Secret below.');
          const cfg = $('#spotify-config-box');
          if (cfg) cfg.style.display = 'block';
        }
      } catch (err) {
        toast(err.message);
        const cfg = $('#spotify-config-box');
        if (cfg) cfg.style.display = 'block';
      }
      return;
    }

    if (b.id === 'btn-save-spotify-creds') {
      const clientId = $('#spotify-input-client-id')?.value.trim();
      const clientSecret = $('#spotify-input-client-secret')?.value.trim();
      if (!clientId || !clientSecret) {
        toast('Please enter both Client ID and Client Secret.');
        return;
      }
      b.disabled = true;
      b.textContent = 'Saving...';
      try {
        const res = await api('/api/integrations/spotify/configure', {
          method: 'POST',
          body: JSON.stringify({ clientId, clientSecret })
        });
        toast('Credentials saved! Redirecting to Spotify...');
        if (res.url) {
          window.location.href = res.url;
        }
      } catch (err) {
        toast(err.message);
        b.disabled = false;
        b.textContent = 'Save & Authorize via Spotify →';
      }
      return;
    }

    if (b.dataset.switchEmbed) {
      const pId = b.dataset.switchEmbed;
      $$('.embed-pill').forEach(p => p.classList.remove('active'));
      b.classList.add('active');
      const frame = $('#spotify-embed-frame');
      if (frame) {
        frame.src = `https://open.spotify.com/embed/playlist/${pId}?utm_source=generator&theme=0`;
      }
      return;
    }

    if (b.dataset.tabTarget) {
      const targetId = b.dataset.tabTarget;
      $$('.sp-tab-content').forEach(el => el.style.display = 'none');
      const targetEl = $(targetId);
      if (targetEl) targetEl.style.display = 'block';
      b.closest('.category-tabs').querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      b.classList.add('active');
      return;
    }

    if (b.id === 'btn-disconnect-spotify') {
      await api('/api/integrations/spotify/disconnect', { method: 'POST' });
      await refresh();
      b.closest('.modal-layer')?.remove();
      toast('Spotify disconnected.');
      return;
    }

    if (b.id === 'btn-do-spotify-search') {
      const q = $('#spotify-search-query')?.value.trim();
      if (!q) return;
      toast('Searching Spotify...');
      const results = await api(`/api/integrations/spotify/search?q=${encodeURIComponent(q)}`);
      $('#spotify-search-results').innerHTML = `
        <div style="display:grid;gap:8px;max-height:220px;overflow-y:auto">
          ${results.tracks.map(t => `
            <div class="mini-row" style="cursor:pointer" data-play-spotify-uri="${esc(t.uri)}">
              <div style="display:flex;align-items:center;gap:10px">
                ${t.albumArt ? `<img src="${t.albumArt}" style="width:32px;height:32px;border-radius:4px" />` : ''}
                <div>
                  <strong>${esc(t.name)}</strong>
                  <small style="display:block;color:var(--muted)">${esc(t.artist)}</small>
                </div>
              </div>
              <button class="primary" style="font-size:10px;padding:4px 8px">Play</button>
            </div>
          `).join('')}
        </div>
      `;
      return;
    }

    // Telegram Step-by-Step Auth Actions
    if (b.id === 'btn-tg-send-otp') {
      const phone = $('#tg-input-phone')?.value.trim();
      if (!phone) {
        toast('Please enter your phone number with country code (e.g. +91...)');
        return;
      }
      b.disabled = true;
      b.textContent = 'Sending Code...';
      try {
        toast('Sending verification code to Telegram app...');
        const res = await api('/api/integrations/telegram/send-code', { method: 'POST', body: JSON.stringify({ phoneNumber: phone }) });
        $('#tg-step-1').style.display = 'none';
        $('#tg-step-2').style.display = 'block';
        $('#tg-input-code')?.focus();
        toast(res.message || 'Verification code sent! Check your Telegram app.');
      } catch (err) {
        toast(err.message);
      } finally {
        b.disabled = false;
        b.textContent = 'Send Verification Code →';
      }
      return;
    }

    if (b.id === 'btn-tg-back-otp') {
      $('#tg-step-2').style.display = 'none';
      $('#tg-step-1').style.display = 'block';
      return;
    }

    if (b.id === 'btn-tg-verify-otp') {
      const code = $('#tg-input-code')?.value.trim();
      if (!code) {
        toast('Please enter the OTP verification code.');
        return;
      }
      const pwd = $('#tg-input-password')?.value || '';
      b.disabled = true;
      b.textContent = 'Verifying with Telegram...';
      try {
        toast('Authenticating with Telegram MTProto...');
        const verRes = await api('/api/integrations/telegram/verify-code', { method: 'POST', body: JSON.stringify({ phoneCode: code, password: pwd }) });
        if (verRes.requiresPassword) {
          toast('2FA password required. Please enter your 2FA password above.');
          $('#tg-input-password')?.focus();
          b.disabled = false;
          b.textContent = 'Verify & Connect →';
          return;
        }
        await refresh();
        b.closest('.modal-layer')?.remove();
        toast('Telegram connected! Secure session saved.');
        openModal('telegram-sync');
      } catch (err) {
        toast(err.message);
        b.disabled = false;
        b.textContent = 'Verify & Connect →';
      }
      return;
    }

    if (b.id === 'btn-tg-scan') {
      toast('Scanning monitored Telegram channels for study materials...');
      const scanRes = await api('/api/integrations/telegram/scan', { method: 'POST' });
      toast(scanRes.message);
      await refresh();
      b.closest('.modal-layer')?.remove();
      openModal('telegram-sync');
      return;
    }

    if (b.id === 'btn-tg-load-sources') {
      toast('Retrieving accessible channels and groups...');
      const sources = await api('/api/integrations/telegram/sources');
      b.closest('.modal')?.querySelector('.panel')?.insertAdjacentHTML('afterend', `
        <div class="panel" style="margin-top:14px">
          <h4>Monitored Channels &amp; Groups</h4>
          <div style="max-height:200px;overflow-y:auto;display:grid;gap:8px">
            ${sources.map(s => `
              <label style="display:flex;align-items:center;gap:8px;font-size:12px">
                <input type="checkbox" data-toggle-source="${s.id}" ${s.selected ? 'checked' : ''} />
                <span>${esc(s.title)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `);
      return;
    }

    if (b.id === 'btn-tg-disconnect') {
      await api('/api/integrations/telegram/disconnect', { method: 'POST' });
      await refresh();
      b.closest('.modal-layer')?.remove();
      toast('Telegram disconnected.');
      return;
    }

    // Telegram Import Review Approval
    if (b.dataset.approveReview) {
      const card = b.closest('.review-item-card');
      const itemId = Number(b.dataset.approveReview);
      const subjectId = card.querySelector('.rev-subj')?.value;
      const title = card.querySelector('.rev-title')?.value;
      const resourceType = card.querySelector('.rev-type')?.value;

      await api('/api/integrations/telegram/review/approve', {
        method: 'POST',
        body: JSON.stringify({ itemId, subjectId, title, resourceType })
      });
      card.remove();
      await refresh();
      toast('Approved and saved to chapter resources.');
      return;
    }

    if (b.dataset.discardReview) {
      const itemId = Number(b.dataset.discardReview);
      await api('/api/integrations/telegram/review/discard', { method: 'POST', body: JSON.stringify({ itemId }) });
      b.closest('.review-item-card')?.remove();
      toast('Item discarded.');
      return;
    }

    // Modal Actions
    if (b.dataset.modal) {
      openModal(b.dataset.modal, b.dataset);
      return;
    }

    if (b.dataset.close || b.closest('[data-close]')) {
      b.closest('.modal-layer')?.remove();
      return;
    }

    // Exam Actions
    if (b.dataset.deleteExam) {
      await api(`/api/exams/${b.dataset.deleteExam}`, { method: 'DELETE' });
      await refresh();
      renderExams();
      toast('Exam removed.');
      return;
    }

    // Topic Manual Learn
    if (b.dataset.topicStatus) {
      await api(`/api/topics/${b.dataset.topicId}`, { method: 'PATCH', body: JSON.stringify({ status: b.dataset.topicStatus }) });
      await refresh();
      toast('Topic progress updated.');
      return;
    }
  } catch (err) {
    console.error(err);
    toast(err.message);
  }
});

// Form Submissions
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  const fd = new FormData(f);
  const data = Object.fromEntries(fd);

  try {
    if (f.id === 'form-add-school-work') {
      await api('/api/school-work', { method: 'POST', body: JSON.stringify(data) });
      f.closest('.modal-layer').remove();
      await refresh();
      renderNotebooks();
      toast('School work saved and scheduled.');
      return;
    }

    if (f.id === 'form-daily-work') {
      await api('/api/daily-work', { method: 'POST', body: JSON.stringify(data) });
      f.closest('.modal-layer').remove();
      await refresh();
      if ($('#daily-work-view').classList.contains('active')) renderDailyWork();
      else renderHome();
      toast('Homework task saved.');
      return;
    }

    if (f.id === 'form-teacher-topic') {
      await api('/api/teacher-topics', { method: 'POST', body: JSON.stringify(data) });
      f.closest('.modal-layer').remove();
      await refresh();
      if ($('#teacher-topics-view').classList.contains('active')) renderTeacherTopics();
      else renderHome();
      toast('⭐ Teacher topic saved. Priorities recalculated.');
      return;
    }

    if (f.id === 'form-edit-backlog') {
      const id = f.dataset.id;
      await api(`/api/backlog/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      f.closest('.modal-layer').remove();
      await refresh();
      renderBacklog();
      toast('Backlog item updated.');
      return;
    }

    if (f.id === 'form-backlog') {
      await api('/api/backlog', { method: 'POST', body: JSON.stringify(data) });
      f.closest('.modal-layer').remove();
      await refresh();
      renderBacklog();
      toast('Backlog item added.');
      return;
    }

    if (f.id === 'form-exam') {
      await api('/api/exams', { method: 'POST', body: JSON.stringify(data) });
      f.closest('.modal-layer').remove();
      await refresh();
      renderExams();
      toast('Exam saved.');
      return;
    }

    if (f.id === 'form-resource') {
      await api('/api/resources', { method: 'POST', body: JSON.stringify({ ...data, subjectId: subjectDetail?.subject?.id || chapterDetail?.chapter?.subject_id, chapterId: chapterDetail?.chapter?.id || null }) });
      f.closest('.modal-layer').remove();
      await refresh();
      if (chapterDetail) renderChapter(chapterDetail.chapter.id);
      toast('Resource linked.');
      return;
    }

    if (f.id === 'form-settings-thresholds') {
      await api('/api/settings', { method: 'POST', body: JSON.stringify(data) });
      await refresh();
      toast('Thresholds updated.');
      return;
    }

    if (f.id === 'form-settings-schedule') {
      await api('/api/settings', { method: 'POST', body: JSON.stringify({ schedule: data }) });
      await refresh();
      toast('Schedule updated.');
      return;
    }
  } catch (err) {
    console.error(err);
    toast(err.message);
  }
});

// Listen to status select changes for notebooks and source toggles
document.addEventListener('change', async e => {
  if (e.target.dataset.updateNotebookStatus) {
    const id = Number(e.target.dataset.updateNotebookStatus);
    const status = e.target.value;
    await api(`/api/school-work/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await refresh();
    renderNotebooks();
    toast(`Status updated to ${statusLabel(status)}`);
  }

  if (e.target.dataset.toggleSource) {
    const sourceId = Number(e.target.dataset.toggleSource);
    const selected = e.target.checked;
    await api('/api/integrations/telegram/sources/toggle', { method: 'POST', body: JSON.stringify({ sourceId, selected }) });
  }
});

// App Bootstrap & Spotify Polling
(async () => {
  try {
    boot = await api('/api/bootstrap');
    if (!boot.configured) {
      document.body.innerHTML = `
        <div class="setup-layer">
          <div class="setup-card">
            <h1>Setup Required</h1>
            <p>Please initialize the setup wizard or run the initial database seed.</p>
          </div>
        </div>
      `;
      return;
    }
    shell();
    await refresh();
    renderHome();

    // Poll currently playing song every 12 seconds
    spotifyInterval = setInterval(updateSpotifyDock, 12000);
  } catch (err) {
    console.error(err);
    document.body.innerHTML = `
      <div class="setup-layer">
        <div class="setup-card">
          <h1>Study OS could not connect</h1>
          <p class="subcopy">Ensure Node.js server is running on port 4173.</p>
        </div>
      </div>
    `;
  }
})();

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { generateTopicQuestions } = require('./cbse_questions');
const { calculateTopicPriority, calculateDayBudget, calculateSmartBudget, formatDuration } = require('./priority_engine');
const telegramManager = require('./integrations/telegram_manager');
const spotifyManager = require('./integrations/spotify_manager');

// Lightweight local env loader: secrets stay in .env and are never sent to the browser.
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
  }
}

const PORT = Number(process.env.PORT || 4173);
const db = new DatabaseSync(process.env.STUDY_OS_DB || path.join(__dirname, 'study-os.db'));

// Schema initialization & migrations
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, syllabus TEXT NOT NULL DEFAULT 'CBSE Class 11', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, color TEXT, UNIQUE(user_id, code), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS chapters (id INTEGER PRIMARY KEY, subject_id INTEGER NOT NULL, title TEXT NOT NULL, position INTEGER NOT NULL, FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS topics (id INTEGER PRIMARY KEY, chapter_id INTEGER NOT NULL, title TEXT NOT NULL, position INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'NOT_STARTED', FOREIGN KEY(chapter_id) REFERENCES chapters(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS resources (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, subject_id INTEGER NOT NULL, chapter_id INTEGER, topic_id INTEGER, title TEXT NOT NULL, type TEXT NOT NULL, source TEXT, url TEXT, drive_file_id TEXT, drive_url TEXT, file_name TEXT, mime_type TEXT, size INTEGER, duration_minutes INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS exams (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, subject_id INTEGER, name TEXT NOT NULL, exam_date TEXT NOT NULL, syllabus_notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS backlog_items (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, subject_id INTEGER NOT NULL, chapter_id INTEGER, topic_id INTEGER, title TEXT, reason TEXT, priority TEXT NOT NULL DEFAULT 'MEDIUM', estimated_minutes INTEGER NOT NULL DEFAULT 30, status TEXT NOT NULL DEFAULT 'OPEN', last_studied_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, subject_id INTEGER, chapter_id INTEGER, topic_id INTEGER, title TEXT NOT NULL, scheduled_for TEXT NOT NULL, estimated_minutes INTEGER NOT NULL DEFAULT 30, status TEXT NOT NULL DEFAULT 'OPEN', source TEXT NOT NULL DEFAULT 'PLANNER', category TEXT DEFAULT 'SELF_STUDY', due_date TEXT, priority TEXT DEFAULT 'MEDIUM', remarks TEXT, attachment TEXT, task_type TEXT DEFAULT 'STUDY', priority_reasons TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS practice_questions (id INTEGER PRIMARY KEY, topic_id INTEGER NOT NULL, prompt TEXT NOT NULL, question_type TEXT, marks INTEGER, source TEXT, options_json TEXT, model_answer TEXT, marking_scheme TEXT, weak_area_tag TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(topic_id) REFERENCES topics(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY, question_id INTEGER NOT NULL, topic_id INTEGER, user_id INTEGER NOT NULL, answer TEXT NOT NULL, submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(question_id) REFERENCES practice_questions(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS evaluations (id INTEGER PRIMARY KEY, submission_id INTEGER NOT NULL, topic_id INTEGER, score REAL, max_score REAL, concept_score REAL, method_score REAL, calculation_score REAL, completeness_score REAL, feedback TEXT, mistakes_json TEXT, weak_areas_json TEXT, correct_approach TEXT, recommendation TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS mastery (id INTEGER PRIMARY KEY, topic_id INTEGER NOT NULL UNIQUE, score REAL NOT NULL DEFAULT 0, next_revision_date TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(topic_id) REFERENCES topics(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS study_sessions (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, subject_id INTEGER, started_at TEXT NOT NULL, ended_at TEXT, minutes INTEGER, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS schedules (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE, school_start TEXT, school_end TEXT, tuition_start TEXT, tuition_end TEXT, available_minutes INTEGER NOT NULL DEFAULT 120, preferred_session TEXT, sleep_start TEXT, sleep_end TEXT, current_day_type TEXT DEFAULT 'NORMAL_SCHOOL_DAY', FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS holidays (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, holiday_date TEXT NOT NULL, label TEXT, day_type TEXT DEFAULT 'HOLIDAY', extra_minutes INTEGER DEFAULT 150, UNIQUE(user_id, holiday_date), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS integrations (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'NOT_CONNECTED', config_json TEXT, UNIQUE(user_id, provider), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS import_review_items (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, provider TEXT NOT NULL, file_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW', suggested_subject_id INTEGER, suggested_chapter_id INTEGER, suggested_topic_id INTEGER, resource_type TEXT, source_ref TEXT, file_size INTEGER, mime_type TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS teacher_important_topics (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, subject_id INTEGER NOT NULL, chapter_id INTEGER, topic_id INTEGER, topic_name TEXT, expected_marks INTEGER DEFAULT 5, importance TEXT NOT NULL DEFAULT 'HIGH', exam_name TEXT, teacher_name TEXT, remarks TEXT, date_added TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS mastery_settings (user_id INTEGER PRIMARY KEY, mastered_threshold INTEGER NOT NULL DEFAULT 90, revision_threshold INTEGER NOT NULL DEFAULT 70, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);

  -- STAGE 4 NEW TABLES:
  CREATE TABLE IF NOT EXISTS telegram_sources (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, peer_id TEXT NOT NULL, title TEXT NOT NULL, username TEXT, is_channel INTEGER DEFAULT 1, is_group INTEGER DEFAULT 0, selected INTEGER DEFAULT 1, last_scanned_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, peer_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS telegram_materials (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, source_id INTEGER, message_id INTEGER NOT NULL, file_name TEXT, file_size INTEGER, mime_type TEXT, text_content TEXT, media_type TEXT, telegram_url TEXT, date TEXT, import_status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, source_id, message_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS spotify_connections (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE, access_token TEXT NOT NULL, refresh_token TEXT, expires_at INTEGER NOT NULL, scope TEXT, user_id_spotify TEXT, display_name TEXT, product TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS school_work (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, subject_id INTEGER NOT NULL, chapter_id INTEGER, topic_id INTEGER, work_type TEXT NOT NULL, description TEXT NOT NULL, estimated_minutes INTEGER NOT NULL DEFAULT 30, remaining_minutes INTEGER NOT NULL DEFAULT 30, due_date TEXT, priority TEXT NOT NULL DEFAULT 'MEDIUM', teacher TEXT, remarks TEXT, attachment TEXT, status TEXT NOT NULL DEFAULT 'NOT_STARTED', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
`);

function safeAddColumn(table, columnDef) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef};`); } catch (_) {}
}
safeAddColumn('tasks', 'category TEXT DEFAULT "SELF_STUDY"');
safeAddColumn('tasks', 'due_date TEXT');
safeAddColumn('tasks', 'priority TEXT DEFAULT "MEDIUM"');
safeAddColumn('tasks', 'remarks TEXT');
safeAddColumn('tasks', 'attachment TEXT');
safeAddColumn('tasks', 'task_type TEXT DEFAULT "STUDY"');
safeAddColumn('tasks', 'priority_reasons TEXT');
safeAddColumn('import_review_items', 'source_ref TEXT');
safeAddColumn('import_review_items', 'file_size INTEGER');
safeAddColumn('import_review_items', 'mime_type TEXT');
safeAddColumn('import_review_items', 'created_at TEXT DEFAULT CURRENT_TIMESTAMP');

const syllabus = {
  physics: [
    'Units and Measurements|Units and standards, Significant figures, Dimensional analysis',
    'Motion in a Straight Line|Position and displacement, Velocity, Acceleration, Equations of motion, Motion graphs',
    'Motion in a Plane|Scalars and vectors, Projectile motion, Uniform circular motion',
    'Laws of Motion|Force and inertia, Newton’s laws, Friction, Circular motion',
    'Work, Energy and Power|Work, Kinetic energy, Potential energy, Conservation of energy',
    'System of Particles and Rotational Motion|Centre of mass, Torque, Angular momentum',
    'Gravitation|Universal gravitation, Satellites, Escape velocity',
    'Mechanical Properties of Solids|Elasticity, Stress and strain',
    'Mechanical Properties of Fluids|Pressure, Buoyancy, Viscosity',
    'Thermal Properties of Matter|Temperature, Heat transfer, Thermal expansion',
    'Thermodynamics|Thermal equilibrium, First law, Heat engines',
    'Kinetic Theory|Molecular nature of matter, Kinetic theory of gases',
    'Oscillations|Periodic motion, Simple harmonic motion',
    'Waves|Wave motion, Sound waves, Doppler effect'
  ],
  chemistry: [
    'Some Basic Concepts of Chemistry|Matter and mole concept, Stoichiometry, Concentration terms',
    'Structure of Atom|Atomic models, Quantum numbers, Electronic configuration',
    'Classification of Elements and Periodicity|Periodic trends, Modern periodic table',
    'Chemical Bonding and Molecular Structure|Ionic bond, Covalent bond, VSEPR theory',
    'Chemical Thermodynamics|System and surroundings, Enthalpy, Entropy',
    'Equilibrium|Chemical equilibrium, Ionic equilibrium, Le Chatelier’s principle',
    'Redox Reactions|Oxidation number, Balancing redox equations',
    'Organic Chemistry: Some Basic Principles|Nomenclature, Electronic effects, Reaction intermediates',
    'Hydrocarbons|Alkanes, Alkenes, Alkynes, Aromatic hydrocarbons'
  ],
  mathematics: [
    'Sets|Representation of sets, Operations on sets',
    'Relations and Functions|Types of relations, Functions and domain',
    'Trigonometric Functions|Angles, Identities, Trigonometric equations',
    'Principle of Mathematical Induction|Induction principle, Applications',
    'Complex Numbers and Quadratic Equations|Complex plane, Quadratic equations',
    'Linear Inequalities|Algebraic inequalities, Graphical solutions',
    'Permutations and Combinations|Counting principle, Permutations, Combinations',
    'Binomial Theorem|Binomial expansion, General term',
    'Sequences and Series|AP, GP, Special series',
    'Straight Lines|Coordinate geometry, Slope, Line equations',
    'Conic Sections|Circle, Parabola, Ellipse, Hyperbola',
    'Introduction to Three-dimensional Geometry|Coordinates in space, Distance formula',
    'Limits and Derivatives|Limits, Derivative as rate of change',
    'Statistics|Measures of dispersion, Mean deviation',
    'Probability|Random experiments, Probability of events'
  ],
  computer: [
    'Computer System|Hardware and software, Memory and storage',
    'Encoding Schemes and Number System|Binary system, Character encoding',
    'Emerging Trends|AI, Big data, Cloud computing',
    'Introduction to Problem Solving|Algorithms, Flowcharts, Decomposition',
    'Getting Started with Python|Tokens, Variables, Data types',
    'Python Fundamentals|Operators, Expressions, Input and output',
    'Flow of Control|Selection, Iteration, Nested loops',
    'Strings|String operations, Traversal, Methods',
    'Lists|List operations, List methods',
    'Tuples and Dictionaries|Tuple operations, Dictionary methods',
    'Society, Law and Ethics|Digital footprint, Cyber safety, IPR'
  ],
  english: [
    'Hornbill: The Portrait of a Lady|Character study, Theme, Textual evidence',
    'Hornbill: We’re Not Afraid to Die|Narrative, Courage, Textual evidence',
    'Hornbill: Discovering Tut|Historical writing, Theme, Textual evidence',
    'Hornbill: The Ailing Planet|Environment, Argument, Textual evidence',
    'Snapshots: The Summer of the Beautiful White Horse|Plot, Character, Theme',
    'Snapshots: The Address|Memory, Theme, Textual evidence',
    'Writing Skills|Note-making, Poster, Speech, Article',
    'Grammar|Tenses, Clauses, Modals, Editing'
  ]
};

const subjectMeta = {
  physics: ['Physics', '#d6764d'],
  chemistry: ['Chemistry', '#6879cc'],
  mathematics: ['Mathematics', '#46a094'],
  computer: ['Computer Science', '#a57bd1'],
  english: ['English', '#d5a342']
};

const all = (sql, ...args) => db.prepare(sql).all(...args);
const one = (sql, ...args) => db.prepare(sql).get(...args);
const run = (sql, ...args) => db.prepare(sql).run(...args);
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
const body = req => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', c => raw += c);
  req.on('end', () => {
    try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
  });
});

function userId() { return one('SELECT id FROM users ORDER BY id LIMIT 1')?.id; }

function subjectRows(uid) {
  return all(`
    SELECT s.*, 
      COUNT(DISTINCT c.id) chapter_count, 
      COUNT(DISTINCT t.id) topic_count, 
      COALESCE(AVG(CASE t.status 
        WHEN 'MASTERED' THEN 100 
        WHEN 'REVISION_REQUIRED' THEN 75 
        WHEN 'PRACTICE_REQUIRED' THEN 40 
        WHEN 'LEARNING' THEN 20 
        ELSE 0 END), 0) progress 
    FROM subjects s 
    LEFT JOIN chapters c ON c.subject_id = s.id 
    LEFT JOIN topics t ON t.chapter_id = c.id 
    WHERE s.user_id = ? AND s.enabled = 1 
    GROUP BY s.id 
    ORDER BY s.id
  `, uid);
}

// Ensure the 18 specific backlog items are seeded for user (Complex Numbers strictly excluded)
function initializeRealBacklog(uid) {
  const existingCount = one('SELECT count(*) as c FROM backlog_items WHERE user_id = ?', uid)?.c || 0;
  if (existingCount > 0) return;

  const initialItems = [
    { subject: 'mathematics', chapter: 'Sets', topic: null, title: 'Sets', reason: 'Class 11 core set theory and operations', priority: 'MEDIUM', minutes: 45 },
    { subject: 'mathematics', chapter: 'Relations and Functions', topic: null, title: 'Relations & Functions', reason: 'Functions domain, range & mapping concepts', priority: 'MEDIUM', minutes: 45 },
    { subject: 'mathematics', chapter: 'Trigonometric Functions', topic: null, title: 'Trigonometric Functions', reason: 'Formulas, transformations & identities practice', priority: 'HIGH', minutes: 60 },
    { subject: 'mathematics', chapter: 'Linear Inequalities', topic: null, title: 'Linear Inequalities', reason: 'Algebraic and graphical solution intervals', priority: 'MEDIUM', minutes: 40 },
    { subject: 'mathematics', chapter: 'Permutations and Combinations', topic: null, title: 'Permutations & Combinations', reason: 'Combinatorial problem solving & counting principle', priority: 'HIGH', minutes: 50 },
    { subject: 'mathematics', chapter: 'Binomial Theorem', topic: null, title: 'Binomial Theorem', reason: 'General term expansions & binomial coefficients', priority: 'MEDIUM', minutes: 45 },

    { subject: 'chemistry', chapter: 'Some Basic Concepts of Chemistry', topic: null, title: 'Some Basic Concepts of Chemistry', reason: 'Mole concept, stoichiometry and concentration calculations', priority: 'HIGH', minutes: 60 },
    { subject: 'chemistry', chapter: 'Structure of Atom', topic: null, title: 'Structure of Atom', reason: 'Bohr model, quantum numbers and electronic configurations', priority: 'MEDIUM', minutes: 50 },
    { subject: 'chemistry', chapter: 'Classification of Elements and Periodicity', topic: null, title: 'Periodic Classification of Elements', reason: 'Periodic trends in properties and modern periodic table', priority: 'MEDIUM', minutes: 40 },
    { subject: 'chemistry', chapter: 'Chemical Bonding and Molecular Structure', topic: null, title: 'Chemical Bonding', reason: 'Lewis structures, VSEPR theory & hybridisation', priority: 'HIGH', minutes: 60 },

    { subject: 'physics', chapter: 'Units and Measurements', topic: 'Dimensional analysis', title: 'Units & Dimensions', reason: 'Dimensional formulas, homogeneity principle & unit conversions', priority: 'MEDIUM', minutes: 40 },
    { subject: 'physics', chapter: 'Motion in a Straight Line', topic: null, title: 'Motion in a Straight Line', reason: 'Kinematic formulas, derivations & motion graphs', priority: 'HIGH', minutes: 50 },
    { subject: 'physics', chapter: 'Motion in a Plane', topic: null, title: 'Motion in Plane', reason: '2D motion principles & uniform circular motion', priority: 'MEDIUM', minutes: 45 },
    { subject: 'physics', chapter: 'Motion in a Plane', topic: 'Scalars and vectors', title: 'Vectors', reason: 'Vector addition, dot product and cross product', priority: 'HIGH', minutes: 45 },
    { subject: 'physics', chapter: 'Motion in a Plane', topic: 'Projectile motion', title: 'Projectile Motion', reason: 'Trajectory equations, time of flight and horizontal range', priority: 'HIGH', minutes: 50 },
    { subject: 'physics', chapter: 'Work, Energy and Power', topic: null, title: 'Work, Power & Energy', reason: 'Work-energy theorem, potential energy and collisions', priority: 'MEDIUM', minutes: 50 },
    { subject: 'physics', chapter: 'Laws of Motion', topic: 'Newton’s laws', title: "Newton's Laws of Motion", reason: 'Free-body diagrams, equilibrium and friction numericals', priority: 'HIGH', minutes: 60 },
    { subject: 'physics', chapter: 'System of Particles and Rotational Motion', topic: null, title: 'Rotational Motion', reason: 'Centre of mass, torque, moment of inertia & angular momentum', priority: 'HIGH', minutes: 60 }
  ];

  for (const item of initialItems) {
    const s = one('SELECT id FROM subjects WHERE user_id = ? AND code = ?', uid, item.subject);
    if (!s) continue;
    let c = null;
    if (item.chapter) c = one('SELECT id FROM chapters WHERE subject_id = ? AND title = ?', s.id, item.chapter);
    let t = null;
    if (c && item.topic) t = one('SELECT id FROM topics WHERE chapter_id = ? AND title = ?', c.id, item.topic);
    run(`
      INSERT INTO backlog_items (user_id, subject_id, chapter_id, topic_id, title, reason, priority, estimated_minutes, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
    `, uid, s.id, c?.id || null, t?.id || null, item.title, item.reason, item.priority, item.minutes);
  }
}

function ensureSettings(uid) {
  const s = one('SELECT * FROM mastery_settings WHERE user_id = ?', uid);
  if (!s) {
    run('INSERT INTO mastery_settings (user_id, mastered_threshold, revision_threshold) VALUES (?, 90, 70)', uid);
  }
  // Ensure schedule has positive available study minutes
  const sc = one('SELECT * FROM schedules WHERE user_id = ?', uid);
  if (sc && Number(sc.available_minutes) <= 0) {
    run('UPDATE schedules SET available_minutes = 120 WHERE user_id = ?', uid);
  }
}

// Calculate subject-wise School Notebook progress (ONLY from manually added items)
function getSubjectNotebookProgress(uid) {
  const subjects = all('SELECT id, name, code, color FROM subjects WHERE user_id = ? AND enabled = 1 ORDER BY id', uid);
  const result = [];

  for (const s of subjects) {
    const counts = one(`
      SELECT 
        COUNT(*) as total, 
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed 
      FROM school_work 
      WHERE user_id = ? AND subject_id = ?
    `, uid, s.id);

    const total = counts.total || 0;
    const completed = counts.completed || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : null;

    result.push({
      subjectId: s.id,
      subjectName: s.name,
      subjectCode: s.code,
      color: s.color,
      total,
      completed,
      progress,
      message: total === 0 ? 'No school notebook work added yet.' : `${progress}% complete (${completed}/${total} items)`
    });
  }

  const overallTotal = result.reduce((a, b) => a + b.total, 0);
  const overallCompleted = result.reduce((a, b) => a + b.completed, 0);
  const overallProgress = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : null;

  return {
    subjects: result,
    overallTotal,
    overallCompleted,
    overallProgress,
    empty: overallTotal === 0
  };
}

function seedUser(data) {
  const name = (data.name || 'Student').trim() || 'Student';
  const uid = run('INSERT INTO users(name, syllabus) VALUES (?,?)', name, data.syllabus || 'CBSE Class 11').lastInsertRowid;
  const enabled = new Set(data.subjects || Object.keys(subjectMeta));

  for (const [code, [sname, color]] of Object.entries(subjectMeta)) {
    const sid = run('INSERT INTO subjects(user_id, code, name, enabled, color) VALUES (?,?,?,?,?)', uid, code, sname, enabled.has(code) ? 1 : 0, color).lastInsertRowid;
    for (const [position, row] of syllabus[code].entries()) {
      const [title, rawTopics] = row.split('|');
      const cid = run('INSERT INTO chapters(subject_id, title, position) VALUES (?,?,?)', sid, title, position + 1).lastInsertRowid;
      for (const [tp, title2] of rawTopics.split(', ').entries()) {
        const tid = run('INSERT INTO topics(chapter_id, title, position) VALUES (?,?,?)', cid, title2, tp + 1).lastInsertRowid;
        run('INSERT INTO mastery(topic_id, score) VALUES (?, 0)', tid);
      }
    }
  }

  const sc = data.schedule || {};
  run(`
    INSERT INTO schedules(user_id, school_start, school_end, tuition_start, tuition_end, available_minutes, preferred_session, sleep_start, sleep_end, current_day_type) 
    VALUES (?,?,?,?,?,?,?,?,?,'NORMAL_SCHOOL_DAY')
  `, uid, sc.schoolStart || '07:30', sc.schoolEnd || '14:30', sc.tuitionStart || '16:00', sc.tuitionEnd || '18:00', Number(sc.availableMinutes) || 120, sc.preferredSession || 'Evening', sc.sleepStart || '23:00', sc.sleepEnd || '06:30');

  for (const h of data.holidays || []) {
    if (h.date) run('INSERT INTO holidays(user_id, holiday_date, label, day_type) VALUES (?,?,?,?)', uid, h.date, h.label || 'Day off', h.dayType || 'HOLIDAY');
  }

  for (const e of data.exams || []) {
    if (e.name && e.date) {
      const sid = one('SELECT id FROM subjects WHERE user_id = ? AND code = ?', uid, e.subject)?.id;
      run('INSERT INTO exams(user_id, subject_id, name, exam_date, syllabus_notes) VALUES (?,?,?,?,?)', uid, sid || null, e.name, e.date, e.syllabus || null);
    }
  }

  for (const p of ['GOOGLE_DRIVE', 'TELEGRAM']) {
    run('INSERT INTO integrations(user_id, provider, status) VALUES (?,?,?)', uid, p, 'NOT_CONNECTED');
  }

  initializeRealBacklog(uid);
  ensureSettings(uid);
  return uid;
}

function bootstrap() {
  const uid = userId();
  if (!uid) return { configured: false };

  initializeRealBacklog(uid);
  ensureSettings(uid);

  const user = one('SELECT * FROM users WHERE id = ?', uid);
  const subjects = subjectRows(uid);
  const exams = all(`
    SELECT e.*, s.name subject_name, CAST(julianday(e.exam_date) - julianday(date('now')) AS INTEGER) days_remaining 
    FROM exams e 
    LEFT JOIN subjects s ON s.id = e.subject_id 
    WHERE e.user_id = ? 
    ORDER BY e.exam_date
  `, uid);

  const backlog = all(`
    SELECT b.*, s.name subject_name, c.title chapter_title, t.title topic_title, COALESCE(m.score, 0) mastery
    FROM backlog_items b 
    JOIN subjects s ON s.id = b.subject_id 
    LEFT JOIN chapters c ON c.id = b.chapter_id 
    LEFT JOIN topics t ON t.id = b.topic_id 
    LEFT JOIN mastery m ON m.topic_id = b.topic_id
    WHERE b.user_id = ? 
    ORDER BY CASE b.status WHEN 'OPEN' THEN 1 WHEN 'IN_PROGRESS' THEN 2 ELSE 3 END,
             CASE b.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END
  `, uid);

  const tasks = all(`
    SELECT t.*, s.name subject_name, c.title chapter_title, tp.title topic_title 
    FROM tasks t 
    LEFT JOIN subjects s ON s.id = t.subject_id 
    LEFT JOIN chapters c ON c.id = t.chapter_id
    LEFT JOIN topics tp ON tp.id = t.topic_id
    WHERE t.user_id = ? AND t.scheduled_for = date('now') 
    ORDER BY CASE t.category WHEN 'SCHOOL' THEN 1 WHEN 'TUITION' THEN 2 WHEN 'NOTEBOOK' THEN 3 WHEN 'HOMEWORK' THEN 4 WHEN 'REVISION' THEN 5 WHEN 'SELF_STUDY' THEN 6 ELSE 7 END, t.status, t.id
  `, uid);

  const dailyWork = all(`
    SELECT t.*, s.name subject_name, c.title chapter_title, tp.title topic_title 
    FROM tasks t 
    LEFT JOIN subjects s ON s.id = t.subject_id 
    LEFT JOIN chapters c ON c.id = t.chapter_id
    LEFT JOIN topics tp ON tp.id = t.topic_id
    WHERE t.user_id = ? AND t.task_type IN ('HOMEWORK', 'NOTEBOOK')
    ORDER BY t.status, CASE t.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, t.due_date
  `, uid);

  const teacherTopics = all(`
    SELECT tt.*, s.name subject_name, c.title chapter_title, t.title topic_title 
    FROM teacher_important_topics tt 
    JOIN subjects s ON s.id = tt.subject_id 
    LEFT JOIN chapters c ON c.id = tt.chapter_id 
    LEFT JOIN topics t ON t.id = tt.topic_id 
    WHERE tt.user_id = ? 
    ORDER BY CASE tt.importance WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, tt.expected_marks DESC, tt.date_added DESC
  `, uid);

  const schedule = one('SELECT * FROM schedules WHERE user_id = ?', uid);
  const settings = one('SELECT * FROM mastery_settings WHERE user_id = ?', uid) || { mastered_threshold: 90, revision_threshold: 70 };
  const holidays = all('SELECT * FROM holidays WHERE user_id = ? ORDER BY holiday_date', uid);

  const overall = subjects.length ? subjects.reduce((a, s) => a + s.progress, 0) / subjects.length : 0;
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.AI_API_KEY);

  // School notebook progress (starts completely empty)
  const notebookProgress = getSubjectNotebookProgress(uid);

  // Integrations status
  const telegramStatus = {
    configured: Boolean(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH),
    connected: one("SELECT status FROM integrations WHERE user_id = ? AND provider = 'TELEGRAM'", uid)?.status === 'CONNECTED'
  };

  const spotifyStatus = spotifyManager.getSpotifyStatus(db, uid);
  const driveStatus = {
    configured: Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET),
    connected: one("SELECT status FROM integrations WHERE user_id = ? AND provider = 'GOOGLE_DRIVE'", uid)?.status === 'CONNECTED'
  };

  const importReviewCount = one("SELECT count(*) as c FROM import_review_items WHERE user_id = ? AND status = 'NEEDS_REVIEW'", uid)?.c || 0;

  // Calculate Smart Time Budget
  const dayType = schedule?.current_day_type || 'NORMAL_SCHOOL_DAY';
  const dayBudget = calculateDayBudget(schedule, dayType);
  const smartBudget = calculateSmartBudget(dayBudget.totalCapacity, tasks);

  return {
    configured: true,
    user,
    subjects,
    exams,
    backlog,
    tasks,
    dailyWork,
    teacherTopics,
    schedule,
    settings,
    holidays,
    overall,
    aiConfigured,
    notebookProgress,
    telegramStatus,
    spotifyStatus,
    driveStatus,
    importReviewCount,
    smartBudget
  };
}

// Generate Priority Study Plan with School Notebook Multi-Day Task Splitting
function generatePlan(uid, dayTypeOverride = null) {
  const schedule = one('SELECT * FROM schedules WHERE user_id = ?', uid);
  if (!schedule) return { message: 'Schedule not configured', tasks: [] };

  const dayType = dayTypeOverride || schedule.current_day_type || 'NORMAL_SCHOOL_DAY';
  const budgetInfo = calculateDayBudget(schedule, dayType);
  let availableMinutes = budgetInfo.totalCapacity;

  // Clear previous auto-generated open study/notebook chunk tasks for today (preserve manual standalone homework)
  run("DELETE FROM tasks WHERE user_id = ? AND scheduled_for = date('now') AND status = 'OPEN' AND task_type NOT IN ('HOMEWORK')", uid);

  const teacherTopics = all('SELECT * FROM teacher_important_topics WHERE user_id = ?', uid);
  const exams = all(`
    SELECT e.*, CAST(julianday(e.exam_date) - julianday(date('now')) AS INTEGER) days_remaining 
    FROM exams e 
    WHERE e.user_id = ? 
    ORDER BY e.exam_date
  `, uid);
  const backlogItems = all("SELECT * FROM backlog_items WHERE user_id = ? AND status = 'OPEN'", uid);
  const pendingHomework = all("SELECT * FROM tasks WHERE user_id = ? AND task_type = 'HOMEWORK' AND status = 'OPEN' ORDER BY CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END", uid);
  const pendingSchoolWork = all("SELECT sw.*, s.name as subject_name FROM school_work sw JOIN subjects s ON s.id = sw.subject_id WHERE sw.user_id = ? AND sw.status != 'COMPLETED' ORDER BY CASE sw.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, sw.due_date", uid);
  const evaluations = all('SELECT * FROM evaluations WHERE topic_id IS NOT NULL', []);

  // 1. First Schedule Urgent School and Tuition Homework
  for (const hw of pendingHomework) {
    const hwMins = Math.min(hw.estimated_minutes || 30, 45);
    if (availableMinutes - hwMins >= 0) {
      availableMinutes -= hwMins;
      run("UPDATE tasks SET scheduled_for = date('now') WHERE id = ?", hw.id);
    }
  }

  // 2. Schedule School Notebook Work with Realistic Multi-Day Splitting
  // e.g. 2-hour notebook task -> 40m today, 40m tomorrow, 40m next day
  for (const sw of pendingSchoolWork) {
    if (availableMinutes < 25) break;

    const remaining = Number(sw.remaining_minutes || sw.estimated_minutes || 30);
    // Allocate realistic session chunk: 30 to 45 min max for today
    const sessionChunk = Math.min(40, remaining, availableMinutes);

    if (sessionChunk >= 20) {
      const isMultiSession = (sw.estimated_minutes || 30) > 45;
      const sessionLabel = isMultiSession ? ` (Session chunk: ${sessionChunk}m)` : '';
      const taskTitle = `📚 ${sw.subject_name} · ${sw.work_type}: ${sw.description}${sessionLabel}`;

      run(`
        INSERT INTO tasks (user_id, subject_id, chapter_id, topic_id, title, scheduled_for, estimated_minutes, status, source, category, priority, task_type, priority_reasons)
        VALUES (?, ?, ?, ?, ?, date('now'), ?, 'OPEN', 'PLANNER', 'NOTEBOOK', ?, 'NOTEBOOK', ?)
      `, uid, sw.subject_id, sw.chapter_id, sw.topic_id, taskTitle, sessionChunk, sw.priority, JSON.stringify([
        { icon: '📚', text: `School Notebook (${sw.work_type}) · ${sw.priority} priority` },
        sw.due_date ? { icon: '⏳', text: `Due date: ${sw.due_date}` } : { icon: '⏱', text: `${remaining}m total remaining` }
      ]));

      availableMinutes -= sessionChunk;
    }
  }

  // 3. Schedule Teacher-Important and High Priority Academic Study Topics
  const allCandidateTopics = all(`
    SELECT t.id, t.chapter_id, t.title, c.title as chapter_title, s.id as subject_id, s.name as subject_name, COALESCE(m.score, 0) as mastery, t.status
    FROM topics t
    JOIN chapters c ON c.id = t.chapter_id
    JOIN subjects s ON s.id = c.subject_id
    LEFT JOIN mastery m ON m.topic_id = t.id
    WHERE s.user_id = ? AND s.enabled = 1 AND t.status != 'MASTERED'
  `, uid);

  const scoredTopics = allCandidateTopics.map(top => {
    const priorityAnalysis = calculateTopicPriority(top, {
      teacherTopics,
      exams,
      backlogItems,
      homeworkItems: pendingHomework,
      evaluations
    });
    return {
      ...top,
      priorityScore: priorityAnalysis.score,
      priorityTier: priorityAnalysis.tier,
      reasons: priorityAnalysis.reasons
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  let studyCount = 0;
  for (const topic of scoredTopics) {
    if (availableMinutes < 25 || studyCount >= 3) break;
    const duration = Math.min(availableMinutes >= 60 ? 45 : 30, availableMinutes);
    const reasonsJson = JSON.stringify(topic.reasons || []);

    const isBacklog = backlogItems.some(b => b.topic_id === topic.id || b.chapter_id === topic.chapter_id);
    const taskType = isBacklog ? 'BACKLOG' : 'STUDY';
    const category = isBacklog ? 'REVISION' : 'SELF_STUDY';

    run(`
      INSERT INTO tasks (user_id, subject_id, chapter_id, topic_id, title, scheduled_for, estimated_minutes, status, source, category, priority, task_type, priority_reasons)
      VALUES (?, ?, ?, ?, ?, date('now'), ?, 'OPEN', 'PLANNER', ?, ?, ?, ?)
    `, uid, topic.subject_id, topic.chapter_id, topic.id, `${topic.subject_name} · ${topic.title}`, duration, category, topic.priorityTier, taskType, reasonsJson);

    availableMinutes -= duration;
    studyCount++;
  }

  // 4. CLAT RULE
  const urgentExams = exams.filter(e => e.days_remaining >= 0 && e.days_remaining <= 3);
  const urgentBacklog = backlogItems.filter(b => b.priority === 'HIGH');
  if (availableMinutes >= 25 && urgentExams.length === 0 && urgentBacklog.length <= 4) {
    const clatMins = Math.min(availableMinutes, 30);
    const clatReasons = JSON.stringify([
      { icon: '⚖️', text: 'Secondary track: scheduled only during manageable Class 11 workload' }
    ]);
    run(`
      INSERT INTO tasks (user_id, title, scheduled_for, estimated_minutes, status, source, category, priority, task_type, priority_reasons)
      VALUES (?, 'CLAT · Reading & Legal Reasoning practice', date('now'), ?, 'OPEN', 'PLANNER', 'CLAT', 'LOW', 'STUDY', ?)
    `, uid, clatMins, clatReasons);
    availableMinutes -= clatMins;
  }

  if (dayTypeOverride) {
    run('UPDATE schedules SET current_day_type = ? WHERE user_id = ?', dayTypeOverride, uid);
  }

  return bootstrap().tasks;
}

// AI Answer Evaluation via Gemini
async function callAIEvaluation(question, answer, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = `You are a certified CBSE Class 11 Board Examiner.
Evaluate this student's response thoroughly according to official CBSE marking guidelines.

Topic Context: ${question.source || 'CBSE Class 11'}
Question: ${question.prompt}
Question Type: ${question.question_type}
Maximum Marks: ${question.marks}
Official Marking Scheme / Model Answer:
${question.model_answer || question.marking_scheme || 'Assess concept accuracy, method, calculations, SI units and answer completeness.'}

Student's Submitted Answer:
"""
${answer}
"""

Evaluate strictly based on:
1. Concept understanding (0-10)
2. Step-by-step method & formula (0-10)
3. Calculation & algebraic accuracy (0-10)
4. CBSE completeness & SI units (0-10)
5. Total question score (0 to ${question.marks})

Return ONLY a valid JSON object matching this schema:
{
  "question_score": number,
  "max_marks": ${question.marks},
  "concept_score": number,
  "method_score": number,
  "calculation_score": number,
  "completeness_score": number,
  "overall_percentage": number,
  "mistakes": ["specific mistake 1", "specific mistake 2"],
  "weak_areas": ["weak concept 1", "weak concept 2"],
  "correct_approach": "concise guidance on proper CBSE presentation",
  "recommendation": "specific revision suggestion",
  "cbse_rubric_feedback": "step-by-step mark breakdown"
}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!res.ok) {
    const errorMsg = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorMsg}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text);
}

// Serve Static Files with SPA Fallback
function serveFile(res, url) {
  let file = url === '/' ? path.join(__dirname, 'index.html') : path.join(__dirname, decodeURIComponent(url));
  if (!file.startsWith(__dirname) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const ext = path.extname(url);
    if (!ext || ext === '.html') {
      file = path.join(__dirname, 'index.html');
    } else {
      res.writeHead(404);
      return res.end('Not found');
    }
  }
  const ext = path.extname(file);
  const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
  fs.createReadStream(file).pipe(res);
}

// HTTP Server & API Endpoints
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);
    const p = u.pathname;
    const uid = userId();

    if (!p.startsWith('/api/')) return serveFile(res, p);

    // Bootstrap
    if (p === '/api/bootstrap' && req.method === 'GET') {
      return json(res, 200, bootstrap());
    }

    // Setup
    if (p === '/api/setup' && req.method === 'POST') {
      if (uid) return json(res, 409, { error: 'Setup already completed' });
      return json(res, 201, bootstrap(seedUser(await body(req))));
    }

    if (!uid) return json(res, 400, { error: 'Complete setup first' });

    // Subjects & Chapters
    if (p === '/api/subjects' && req.method === 'GET') {
      return json(res, 200, subjectRows(uid));
    }

    if (/^\/api\/subjects\/\d+$/.test(p) && req.method === 'GET') {
      const sid = Number(p.split('/').pop());
      const subject = one('SELECT * FROM subjects WHERE id = ? AND user_id = ?', sid, uid);
      if (!subject) return json(res, 404, { error: 'Subject not found' });
      const chapters = all(`
        SELECT c.*, 
          COALESCE(AVG(CASE t.status 
            WHEN 'MASTERED' THEN 100 
            WHEN 'REVISION_REQUIRED' THEN 75 
            WHEN 'PRACTICE_REQUIRED' THEN 40 
            WHEN 'LEARNING' THEN 20 
            ELSE 0 END), 0) progress 
        FROM chapters c 
        LEFT JOIN topics t ON t.chapter_id = c.id 
        WHERE c.subject_id = ? 
        GROUP BY c.id 
        ORDER BY c.position
      `, sid);
      return json(res, 200, { subject, chapters });
    }

    if (/^\/api\/chapters\/\d+$/.test(p) && req.method === 'GET') {
      const cid = Number(p.split('/').pop());
      const chapter = one(`
        SELECT c.*, s.name subject_name, s.id subject_id, s.color 
        FROM chapters c 
        JOIN subjects s ON s.id = c.subject_id 
        WHERE c.id = ? AND s.user_id = ?
      `, cid, uid);
      if (!chapter) return json(res, 404, { error: 'Chapter not found' });
      const topics = all(`
        SELECT t.*, COALESCE(m.score, 0) mastery, m.next_revision_date 
        FROM topics t 
        LEFT JOIN mastery m ON m.topic_id = t.id 
        WHERE t.chapter_id = ? 
        ORDER BY t.position
      `, cid);
      const resources = all('SELECT * FROM resources WHERE user_id = ? AND chapter_id = ? ORDER BY created_at DESC', uid, cid);
      return json(res, 200, { chapter, topics, resources });
    }

    // Topics Status Update
    if (/^\/api\/topics\/\d+$/.test(p) && req.method === 'PATCH') {
      const id = Number(p.split('/').pop());
      const data = await body(req);
      const allowed = ['NOT_STARTED', 'LEARNING', 'PRACTICE_REQUIRED', 'REVISION_REQUIRED', 'MASTERED'];
      if (!allowed.includes(data.status)) return json(res, 400, { error: 'Invalid status' });

      run('UPDATE topics SET status = ? WHERE id = ?', data.status, id);
      const scoreMap = { NOT_STARTED: 0, LEARNING: 20, PRACTICE_REQUIRED: 45, REVISION_REQUIRED: 75, MASTERED: 100 };
      const score = data.score !== undefined ? data.score : scoreMap[data.status];
      run('UPDATE mastery SET score = ?, updated_at = CURRENT_TIMESTAMP WHERE topic_id = ?', score, id);

      if (data.status === 'MASTERED') {
        run("UPDATE backlog_items SET status = 'DONE', last_studied_at = CURRENT_TIMESTAMP WHERE topic_id = ? AND user_id = ?", id, uid);
      }

      return json(res, 200, { ok: true, status: data.status, score });
    }

    // ==========================================
    // STAGE 4: SCHOOL NOTEBOOK SYSTEM
    // ==========================================
    if (p === '/api/school-work' && req.method === 'GET') {
      const rows = all(`
        SELECT sw.*, s.name as subject_name, c.title as chapter_title, tp.title as topic_title
        FROM school_work sw
        JOIN subjects s ON s.id = sw.subject_id
        LEFT JOIN chapters c ON c.id = sw.chapter_id
        LEFT JOIN topics tp ON tp.id = sw.topic_id
        WHERE sw.user_id = ?
        ORDER BY CASE sw.status WHEN 'NOT_STARTED' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'NEEDS_CORRECTION' THEN 3 ELSE 4 END,
                 CASE sw.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
                 sw.due_date
      `, uid);
      return json(res, 200, rows);
    }

    if (p === '/api/school-work' && req.method === 'POST') {
      const d = await body(req);
      const mins = Number(d.estimatedMinutes) || 30;
      const id = run(`
        INSERT INTO school_work (user_id, subject_id, chapter_id, topic_id, work_type, description, estimated_minutes, remaining_minutes, due_date, priority, teacher, remarks, attachment, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NOT_STARTED')
      `, uid, d.subjectId, d.chapterId || null, d.topicId || null, d.workType || 'Classwork', d.description, mins, mins, d.dueDate || null, d.priority || 'MEDIUM', d.teacher || null, d.remarks || null, d.attachment || null).lastInsertRowid;

      generatePlan(uid);
      return json(res, 201, { id, ok: true });
    }

    if (/^\/api\/school-work\/\d+$/.test(p) && req.method === 'PATCH') {
      const id = Number(p.split('/').pop());
      const d = await body(req);
      const fields = [];
      const args = [];

      if (d.status !== undefined) {
        fields.push('status = ?');
        args.push(d.status);
        if (d.status === 'COMPLETED') {
          fields.push('completed_at = CURRENT_TIMESTAMP');
          fields.push('remaining_minutes = 0');
        }
      }
      if (d.remainingMinutes !== undefined) { fields.push('remaining_minutes = ?'); args.push(Number(d.remainingMinutes)); }
      if (d.description !== undefined) { fields.push('description = ?'); args.push(d.description); }
      if (d.priority !== undefined) { fields.push('priority = ?'); args.push(d.priority); }
      if (d.dueDate !== undefined) { fields.push('due_date = ?'); args.push(d.dueDate || null); }
      if (d.remarks !== undefined) { fields.push('remarks = ?'); args.push(d.remarks || null); }

      if (fields.length > 0) {
        args.push(id, uid);
        run(`UPDATE school_work SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, ...args);
        generatePlan(uid);
      }
      return json(res, 200, { ok: true });
    }

    if (/^\/api\/school-work\/\d+$/.test(p) && req.method === 'DELETE') {
      const id = Number(p.split('/').pop());
      run('DELETE FROM school_work WHERE id = ? AND user_id = ?', id, uid);
      generatePlan(uid);
      return json(res, 200, { ok: true });
    }

    if (p === '/api/school-work/progress' && req.method === 'GET') {
      return json(res, 200, getSubjectNotebookProgress(uid));
    }

    // ==========================================
    // STAGE 4: TELEGRAM INTEGRATION
    // ==========================================
    if (p === '/api/integrations/telegram/status' && req.method === 'GET') {
      const status = await telegramManager.getTelegramStatus(db, uid);
      return json(res, 200, status);
    }

    if (p === '/api/integrations/telegram/send-code' && req.method === 'POST') {
      const d = await body(req);
      if (!d.phoneNumber) return json(res, 400, { error: 'Phone number is required' });
      const result = await telegramManager.sendAuthCode(db, uid, d.phoneNumber);
      return json(res, 200, result);
    }

    if (p === '/api/integrations/telegram/verify-code' && req.method === 'POST') {
      const d = await body(req);
      if (!d.phoneCode) return json(res, 400, { error: 'Verification code is required' });
      const result = await telegramManager.verifyAuthCode(db, uid, d.phoneCode, d.password || '');
      return json(res, 200, result);
    }

    if (p === '/api/integrations/telegram/sources' && req.method === 'GET') {
      const sources = await telegramManager.getAccessibleSources(db, uid);
      return json(res, 200, sources);
    }

    if (p === '/api/integrations/telegram/sources/toggle' && req.method === 'POST') {
      const d = await body(req);
      telegramManager.toggleSource(db, uid, d.sourceId, d.selected);
      return json(res, 200, { ok: true });
    }

    if (p === '/api/integrations/telegram/scan' && req.method === 'POST') {
      const scanResult = await telegramManager.scanSelectedSources(db, uid);
      return json(res, 200, scanResult);
    }

    if (p === '/api/integrations/telegram/review' && req.method === 'GET') {
      const items = all(`
        SELECT ir.*, s.name as suggested_subject_name, c.title as suggested_chapter_title
        FROM import_review_items ir
        LEFT JOIN subjects s ON s.id = ir.suggested_subject_id
        LEFT JOIN chapters c ON c.id = ir.suggested_chapter_id
        WHERE ir.user_id = ? AND ir.status = 'NEEDS_REVIEW'
        ORDER BY ir.created_at DESC
      `, uid);
      return json(res, 200, items);
    }

    if (p === '/api/integrations/telegram/review/approve' && req.method === 'POST') {
      const d = await body(req);
      const item = one('SELECT * FROM import_review_items WHERE id = ? AND user_id = ?', d.itemId, uid);
      if (!item) return json(res, 404, { error: 'Review item not found' });

      // Save into resources
      const resId = run(`
        INSERT INTO resources (user_id, subject_id, chapter_id, topic_id, title, type, source, url, mime_type, size)
        VALUES (?, ?, ?, ?, ?, ?, 'Telegram', ?, ?, ?)
      `, uid, d.subjectId || item.suggested_subject_id, d.chapterId || item.suggested_chapter_id, d.topicId || item.suggested_topic_id, d.title || item.file_name, d.resourceType || item.resource_type, item.source_ref, item.mime_type, item.file_size).lastInsertRowid;

      run("UPDATE import_review_items SET status = 'APPROVED' WHERE id = ?", d.itemId);
      return json(res, 200, { ok: true, resourceId: resId });
    }

    if (p === '/api/integrations/telegram/review/discard' && req.method === 'POST') {
      const d = await body(req);
      run("UPDATE import_review_items SET status = 'DISCARDED' WHERE id = ? AND user_id = ?", d.itemId, uid);
      return json(res, 200, { ok: true });
    }

    if (p === '/api/integrations/telegram/disconnect' && req.method === 'POST') {
      telegramManager.disconnectTelegram(db, uid);
      return json(res, 200, { ok: true });
    }

    // ==========================================
    // STAGE 4: SPOTIFY INTEGRATION
    // ==========================================
    if (p === '/api/integrations/spotify/auth-url' && req.method === 'GET') {
      try {
        const url = spotifyManager.getAuthUrl();
        return json(res, 200, { url, configured: true });
      } catch (err) {
        return json(res, 200, { configured: false, error: err.message });
      }
    }

    if (p === '/api/integrations/spotify/configure' && req.method === 'POST') {
      const d = await body(req);
      const clientId = String(d.clientId || '').trim();
      const clientSecret = String(d.clientSecret || '').trim();
      if (!clientId || !clientSecret) {
        return json(res, 400, { error: 'Client ID and Client Secret are required.' });
      }

      process.env.SPOTIFY_CLIENT_ID = clientId;
      process.env.SPOTIFY_CLIENT_SECRET = clientSecret;

      const envPath = path.join(__dirname, '.env');
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf8');
        content = content.replace(/^SPOTIFY_CLIENT_ID=.*$/m, `SPOTIFY_CLIENT_ID=${clientId}`);
        content = content.replace(/^SPOTIFY_CLIENT_SECRET=.*$/m, `SPOTIFY_CLIENT_SECRET=${clientSecret}`);
        fs.writeFileSync(envPath, content, 'utf8');
      }

      try {
        const url = spotifyManager.getAuthUrl();
        return json(res, 200, { ok: true, url });
      } catch (e) {
        return json(res, 200, { ok: true, message: 'Saved successfully.' });
      }
    }

    if (p === '/api/integrations/spotify/callback' && req.method === 'GET') {
      const code = u.searchParams.get('code');
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        return res.end('<h1>Spotify connection error: No code provided</h1>');
      }
      await spotifyManager.exchangeCode(db, uid, code);
      // Redirect back to main application
      res.writeHead(302, { 'Location': '/#settings' });
      return res.end();
    }

    if (p === '/api/integrations/spotify/status' && req.method === 'GET') {
      return json(res, 200, spotifyManager.getSpotifyStatus(db, uid));
    }

    if (p === '/api/integrations/spotify/playlists' && req.method === 'GET') {
      const playlists = await spotifyManager.getUserPlaylists(db, uid);
      return json(res, 200, playlists);
    }

    if (p === '/api/integrations/spotify/search' && req.method === 'GET') {
      const query = u.searchParams.get('q') || '';
      const type = u.searchParams.get('type') || 'track,artist,album,playlist';
      if (!query.trim()) return json(res, 200, { tracks: [], playlists: [] });
      const results = await spotifyManager.searchMusic(db, uid, query, type);
      return json(res, 200, results);
    }

    if (p === '/api/integrations/spotify/player' && req.method === 'GET') {
      const playerState = await spotifyManager.getCurrentlyPlaying(db, uid);
      return json(res, 200, playerState);
    }

    if (p === '/api/integrations/spotify/player/action' && req.method === 'POST') {
      const d = await body(req);
      const result = await spotifyManager.playbackControl(db, uid, d.action, d.uri || null);
      return json(res, 200, result);
    }

    if (p === '/api/integrations/spotify/disconnect' && req.method === 'POST') {
      spotifyManager.disconnectSpotify(db, uid);
      return json(res, 200, { ok: true });
    }

    // ==========================================
    // STAGE 4: GOOGLE DRIVE INTEGRATION
    // ==========================================
    if (p === '/api/integrations/google-drive/status' && req.method === 'GET') {
      const configured = Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET);
      const row = one("SELECT * FROM integrations WHERE user_id = ? AND provider = 'GOOGLE_DRIVE'", uid);
      return json(res, 200, {
        configured,
        connected: row?.status === 'CONNECTED',
        provider: 'GOOGLE_DRIVE'
      });
    }

    if (p === '/api/integrations/google-drive/parse-link' && req.method === 'POST') {
      const d = await body(req);
      const url = String(d.url || '').trim();
      let fileId = null;
      const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (fileMatch) fileId = fileMatch[1];

      const previewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
      return json(res, 200, {
        isDrive: Boolean(url.includes('drive.google.com') || url.includes('docs.google.com')),
        fileId,
        previewUrl,
        originalUrl: url
      });
    }

    // DAILY WORK / HOMEWORK CRUD
    if (p === '/api/daily-work' && req.method === 'GET') {
      const rows = all(`
        SELECT t.*, s.name subject_name, c.title chapter_title, tp.title topic_title 
        FROM tasks t 
        LEFT JOIN subjects s ON s.id = t.subject_id 
        LEFT JOIN chapters c ON c.id = t.chapter_id 
        LEFT JOIN topics tp ON tp.id = t.topic_id 
        WHERE t.user_id = ? AND t.task_type IN ('HOMEWORK', 'NOTEBOOK')
        ORDER BY t.status, CASE t.priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, t.due_date
      `, uid);
      return json(res, 200, rows);
    }

    if (p === '/api/daily-work' && req.method === 'POST') {
      const d = await body(req);
      const category = (d.category || 'SCHOOL').toUpperCase();
      const taskType = category === 'NOTEBOOK' ? 'NOTEBOOK' : 'HOMEWORK';
      const id = run(`
        INSERT INTO tasks (user_id, subject_id, chapter_id, topic_id, title, scheduled_for, estimated_minutes, status, source, category, due_date, priority, remarks, attachment, task_type) 
        VALUES (?, ?, ?, ?, ?, date('now'), ?, 'OPEN', 'HOMEWORK', ?, ?, ?, ?, ?, ?)
      `, uid, d.subjectId || null, d.chapterId || null, d.topicId || null, d.title, Number(d.duration) || 30, category, d.dueDate || null, d.priority || 'MEDIUM', d.remarks || null, d.attachment || null, taskType).lastInsertRowid;
      return json(res, 201, { id, ok: true });
    }

    if (/^\/api\/daily-work\/\d+$/.test(p) && req.method === 'PATCH') {
      const id = Number(p.split('/').pop());
      const d = await body(req);
      if (d.status !== undefined) {
        run('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?', d.status, id, uid);
      }
      return json(res, 200, { ok: true });
    }

    if (/^\/api\/daily-work\/\d+$/.test(p) && req.method === 'DELETE') {
      const id = Number(p.split('/').pop());
      run('DELETE FROM tasks WHERE id = ? AND user_id = ?', id, uid);
      return json(res, 200, { ok: true });
    }

    // TEACHER IMPORTANT TOPICS
    if (p === '/api/teacher-topics' && req.method === 'GET') {
      const rows = all(`
        SELECT tt.*, s.name subject_name, c.title chapter_title, t.title topic_title 
        FROM teacher_important_topics tt 
        JOIN subjects s ON s.id = tt.subject_id 
        LEFT JOIN chapters c ON c.id = tt.chapter_id 
        LEFT JOIN topics t ON t.id = tt.topic_id 
        WHERE tt.user_id = ? 
        ORDER BY CASE tt.importance WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, tt.expected_marks DESC
      `, uid);
      return json(res, 200, rows);
    }

    if (p === '/api/teacher-topics' && req.method === 'POST') {
      const d = await body(req);
      const id = run(`
        INSERT INTO teacher_important_topics (user_id, subject_id, chapter_id, topic_id, topic_name, expected_marks, importance, exam_name, teacher_name, remarks) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, uid, d.subjectId, d.chapterId || null, d.topicId || null, d.topicName || null, Number(d.expectedMarks) || 5, d.importance || 'HIGH', d.examName || null, d.teacherName || null, d.remarks || null).lastInsertRowid;

      generatePlan(uid);
      return json(res, 201, { id, ok: true });
    }

    if (/^\/api\/teacher-topics\/\d+$/.test(p) && req.method === 'DELETE') {
      const id = Number(p.split('/').pop());
      run('DELETE FROM teacher_important_topics WHERE id = ? AND user_id = ?', id, uid);
      generatePlan(uid);
      return json(res, 200, { ok: true });
    }

    // PRIORITY ANALYSIS
    if (p === '/api/priority-analysis' && req.method === 'GET') {
      const candidateTopics = all(`
        SELECT t.id, t.chapter_id, t.title, c.title as chapter_title, s.id as subject_id, s.name as subject_name, COALESCE(m.score, 0) as mastery, t.status
        FROM topics t
        JOIN chapters c ON c.id = t.chapter_id
        JOIN subjects s ON s.id = c.subject_id
        LEFT JOIN mastery m ON m.topic_id = t.id
        WHERE s.user_id = ? AND s.enabled = 1
      `, uid);

      const teacherTopics = all('SELECT * FROM teacher_important_topics WHERE user_id = ?', uid);
      const exams = all(`SELECT e.*, CAST(julianday(e.exam_date) - julianday(date('now')) AS INTEGER) days_remaining FROM exams e WHERE e.user_id = ?`, uid);
      const backlogItems = all("SELECT * FROM backlog_items WHERE user_id = ? AND status = 'OPEN'", uid);
      const homeworkItems = all("SELECT * FROM tasks WHERE user_id = ? AND task_type = 'HOMEWORK' AND status = 'OPEN'", uid);

      const scored = candidateTopics.map(t => {
        const analysis = calculateTopicPriority(t, { teacherTopics, exams, backlogItems, homeworkItems });
        return { ...t, ...analysis };
      }).sort((a, b) => b.score - a.score);

      return json(res, 200, scored);
    }

    // STUDY PLAN GENERATION & TASKS
    if (p === '/api/tasks' && req.method === 'GET') {
      return json(res, 200, bootstrap().tasks);
    }

    if (p === '/api/tasks/generate' && req.method === 'POST') {
      const d = await body(req);
      const updatedTasks = generatePlan(uid, d.dayType);
      return json(res, 200, updatedTasks);
    }

    if (/^\/api\/tasks\/\d+$/.test(p) && req.method === 'PATCH') {
      const id = Number(p.split('/').pop());
      const d = await body(req);
      run('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?', d.status, id, uid);
      return json(res, 200, { ok: true });
    }

    // CBSE PRACTICE QUESTIONS & EVALUATION FLOW
    if (p === '/api/practice/questions' && req.method === 'GET') {
      const topicId = Number(u.searchParams.get('topicId'));
      if (!topicId) return json(res, 400, { error: 'topicId parameter required' });

      const topic = one(`
        SELECT t.*, c.title as chapter_title, s.name as subject_name 
        FROM topics t 
        JOIN chapters c ON c.id = t.chapter_id 
        JOIN subjects s ON s.id = c.subject_id 
        WHERE t.id = ?
      `, topicId);
      if (!topic) return json(res, 404, { error: 'Topic not found' });

      let questions = all('SELECT * FROM practice_questions WHERE topic_id = ? ORDER BY id', topicId);
      if (questions.length === 0) {
        const generated = generateTopicQuestions(topic.title, topic.chapter_title, topic.subject_name);
        for (const q of generated) {
          run(`
            INSERT INTO practice_questions (topic_id, prompt, question_type, marks, source, options_json, model_answer, marking_scheme, weak_area_tag) 
            VALUES (?, ?, ?, ?, 'CBSE Class 11 Question Bank', ?, ?, ?, ?)
          `, topicId, q.prompt, q.question_type, q.marks, q.options ? JSON.stringify(q.options) : null, q.model_answer, q.marking_scheme, q.weak_area_tag);
        }
        questions = all('SELECT * FROM practice_questions WHERE topic_id = ? ORDER BY id', topicId);
      }

      const formatted = questions.map(q => ({
        ...q,
        options: q.options_json ? JSON.parse(q.options_json) : null
      }));

      return json(res, 200, { topic, questions: formatted });
    }

    // Submit Answer for AI Evaluation
    if (p === '/api/practice/submit' && req.method === 'POST') {
      const d = await body(req);
      const questionId = Number(d.questionId);
      const answer = (d.answer || '').trim();
      const question = one('SELECT * FROM practice_questions WHERE id = ?', questionId);
      if (!question) return json(res, 404, { error: 'Question not found' });

      const subId = run(`
        INSERT INTO submissions (question_id, topic_id, user_id, answer) 
        VALUES (?, ?, ?, ?)
      `, questionId, question.topic_id, uid, answer).lastInsertRowid;

      const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

      if (!apiKey) {
        return json(res, 200, {
          configured: false,
          error: 'AI evaluation is not configured. Add GEMINI_API_KEY in .env to enable automated AI grading.',
          submissionId: subId,
          questionId,
          maxMarks: question.marks,
          modelAnswer: question.model_answer,
          markingScheme: question.marking_scheme,
          weakAreaTag: question.weak_area_tag
        });
      }

      try {
        const evalResult = await callAIEvaluation(question, answer, apiKey);
        run(`
          INSERT INTO evaluations (submission_id, topic_id, score, max_score, concept_score, method_score, calculation_score, completeness_score, feedback, mistakes_json, weak_areas_json, correct_approach, recommendation) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, subId, question.topic_id, evalResult.question_score, question.marks, evalResult.concept_score, evalResult.method_score, evalResult.calculation_score, evalResult.completeness_score, evalResult.cbse_rubric_feedback, JSON.stringify(evalResult.mistakes || []), JSON.stringify(evalResult.weak_areas || []), evalResult.correct_approach, evalResult.recommendation);

        return json(res, 200, {
          configured: true,
          submissionId: subId,
          ...evalResult
        });
      } catch (err) {
        return json(res, 500, {
          configured: true,
          error: `AI evaluation provider error: ${err.message}`,
          modelAnswer: question.model_answer,
          markingScheme: question.marking_scheme
        });
      }
    }

    // Record Score & Determine Mastery Decision
    if (p === '/api/practice/record-score' && req.method === 'POST') {
      const d = await body(req);
      const topicId = Number(d.topicId);
      const score = Number(d.score) || 0;
      const maxScore = Number(d.maxScore) || 10;
      const percentage = Math.round((score / maxScore) * 100);

      const settings = one('SELECT * FROM mastery_settings WHERE user_id = ?', uid) || { mastered_threshold: 90, revision_threshold: 70 };
      let newStatus = 'PRACTICE_REQUIRED';
      let nextRevision = null;

      if (percentage >= settings.mastered_threshold) {
        newStatus = 'MASTERED';
        nextRevision = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      } else if (percentage >= settings.revision_threshold) {
        newStatus = 'REVISION_REQUIRED';
        nextRevision = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }

      run('UPDATE topics SET status = ? WHERE id = ?', newStatus, topicId);
      run('UPDATE mastery SET score = ?, next_revision_date = ?, updated_at = CURRENT_TIMESTAMP WHERE topic_id = ?', percentage, nextRevision, topicId);

      if (newStatus === 'MASTERED') {
        run("UPDATE backlog_items SET status = 'DONE', last_studied_at = CURRENT_TIMESTAMP WHERE topic_id = ? AND user_id = ?", topicId, uid);
        generatePlan(uid);
      }

      return json(res, 200, {
        ok: true,
        percentage,
        status: newStatus,
        nextRevision
      });
    }

    // BACKLOG MANAGEMENT (Fully Editable)
    if (p === '/api/backlog' && req.method === 'GET') {
      return json(res, 200, bootstrap().backlog);
    }

    if (p === '/api/backlog' && req.method === 'POST') {
      const d = await body(req);
      const id = run(`
        INSERT INTO backlog_items(user_id, subject_id, chapter_id, topic_id, title, reason, priority, estimated_minutes, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
      `, uid, d.subjectId, d.chapterId || null, d.topicId || null, d.title || null, d.reason || null, d.priority || 'MEDIUM', Number(d.minutes) || 30).lastInsertRowid;
      generatePlan(uid);
      return json(res, 201, { id, ok: true });
    }

    if (/^\/api\/backlog\/\d+$/.test(p) && req.method === 'PATCH') {
      const id = Number(p.split('/').pop());
      const d = await body(req);
      const fields = [];
      const args = [];

      if (d.subjectId !== undefined) { fields.push('subject_id = ?'); args.push(d.subjectId); }
      if (d.chapterId !== undefined) { fields.push('chapter_id = ?'); args.push(d.chapterId || null); }
      if (d.topicId !== undefined) { fields.push('topic_id = ?'); args.push(d.topicId || null); }
      if (d.title !== undefined) { fields.push('title = ?'); args.push(d.title); }
      if (d.reason !== undefined) { fields.push('reason = ?'); args.push(d.reason); }
      if (d.priority !== undefined) { fields.push('priority = ?'); args.push(d.priority); }
      if (d.minutes !== undefined || d.estimated_minutes !== undefined) { fields.push('estimated_minutes = ?'); args.push(Number(d.minutes || d.estimated_minutes) || 30); }
      if (d.status !== undefined) { fields.push('status = ?'); args.push(d.status); }

      if (fields.length > 0) {
        args.push(id, uid);
        run(`UPDATE backlog_items SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, ...args);
        generatePlan(uid);
      }
      return json(res, 200, { ok: true });
    }

    if (/^\/api\/backlog\/\d+$/.test(p) && req.method === 'DELETE') {
      const id = Number(p.split('/').pop());
      run('DELETE FROM backlog_items WHERE id = ? AND user_id = ?', id, uid);
      generatePlan(uid);
      return json(res, 200, { ok: true });
    }

    // EXAMS
    if (p === '/api/exams' && req.method === 'GET') return json(res, 200, bootstrap().exams);

    if (p === '/api/exams' && req.method === 'POST') {
      const d = await body(req);
      const id = run(`
        INSERT INTO exams(user_id, subject_id, name, exam_date, syllabus_notes) 
        VALUES (?, ?, ?, ?, ?)
      `, uid, d.subjectId || null, d.name, d.date, d.syllabus || null).lastInsertRowid;
      generatePlan(uid);
      return json(res, 201, { id, ok: true });
    }

    if (/^\/api\/exams\/\d+$/.test(p) && req.method === 'DELETE') {
      run('DELETE FROM exams WHERE id = ? AND user_id = ?', Number(p.split('/').pop()), uid);
      generatePlan(uid);
      return json(res, 200, { ok: true });
    }

    // SETTINGS & SCHEDULES
    if (p === '/api/settings' && req.method === 'GET') {
      const settings = one('SELECT * FROM mastery_settings WHERE user_id = ?', uid);
      const schedule = one('SELECT * FROM schedules WHERE user_id = ?', uid);
      const holidays = all('SELECT * FROM holidays WHERE user_id = ? ORDER BY holiday_date', uid);
      return json(res, 200, {
        settings,
        schedule,
        holidays,
        aiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.AI_API_KEY),
        telegramConfigured: Boolean(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH),
        spotifyConfigured: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
        driveConfigured: Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET)
      });
    }

    if (p === '/api/settings' && req.method === 'POST') {
      const d = await body(req);
      if (d.masteredThreshold !== undefined || d.revisionThreshold !== undefined) {
        run(`
          INSERT INTO mastery_settings (user_id, mastered_threshold, revision_threshold) 
          VALUES (?, ?, ?) 
          ON CONFLICT(user_id) DO UPDATE SET mastered_threshold = excluded.mastered_threshold, revision_threshold = excluded.revision_threshold
        `, uid, Number(d.masteredThreshold) || 90, Number(d.revisionThreshold) || 70);
      }
      if (d.schedule) {
        const sc = d.schedule;
        run(`
          UPDATE schedules SET 
            school_start = ?, school_end = ?, tuition_start = ?, tuition_end = ?, 
            available_minutes = ?, preferred_session = ?, sleep_start = ?, sleep_end = ? 
          WHERE user_id = ?
        `, sc.schoolStart, sc.schoolEnd, sc.tuitionStart, sc.tuitionEnd, Number(sc.availableMinutes) || 120, sc.preferredSession, sc.sleepStart, sc.sleepEnd, uid);
      }
      return json(res, 200, { ok: true });
    }

    // RESOURCES
    if (p === '/api/resources' && req.method === 'POST') {
      const d = await body(req);
      const id = run(`
        INSERT INTO resources(user_id, subject_id, chapter_id, topic_id, title, type, source, url, drive_file_id, drive_url, duration_minutes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, uid, d.subjectId, d.chapterId || null, d.topicId || null, d.title, d.type, d.source || null, d.url || null, d.driveFileId || null, d.driveUrl || null, Number(d.duration) || null).lastInsertRowid;
      return json(res, 201, { id });
    }

    // INTEGRATIONS OVERVIEW
    if (p === '/api/integrations' && req.method === 'GET') {
      const rows = all('SELECT provider, status FROM integrations WHERE user_id = ?', uid);
      return json(res, 200, rows);
    }

    return json(res, 404, { error: 'Unknown endpoint' });
  } catch (err) {
    console.error(err);
    json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`Class 11 Study OS running at http://localhost:${PORT}`));

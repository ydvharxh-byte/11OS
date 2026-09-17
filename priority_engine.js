// priority_engine.js — Transparent Study Priority Engine & Planner Generator

function calculateTopicPriority(topic, options = {}) {
  const {
    teacherTopics = [],
    exams = [],
    backlogItems = [],
    homeworkItems = [],
    evaluations = []
  } = options;

  let score = 20; // Base baseline
  const reasons = [];

  // 1. Teacher Importance Check
  const matchingTeacherTopic = teacherTopics.find(tt => 
    (tt.topic_id && tt.topic_id === topic.id) ||
    (tt.chapter_id && tt.chapter_id === topic.chapter_id) ||
    (tt.topic_name && topic.title && tt.topic_name.toLowerCase().includes(topic.title.toLowerCase()))
  );

  if (matchingTeacherTopic) {
    const importance = (matchingTeacherTopic.importance || 'HIGH').toUpperCase();
    const impWeight = importance === 'HIGH' ? 45 : importance === 'MEDIUM' ? 25 : 12;
    score += impWeight;
    
    const marksWeight = (Number(matchingTeacherTopic.expected_marks) || 5) * 3;
    score += marksWeight;

    reasons.push({
      icon: '⭐',
      text: `Teacher marked important (${importance} priority)`,
      marks: matchingTeacherTopic.expected_marks,
      teacher: matchingTeacherTopic.teacher_name,
      remarks: matchingTeacherTopic.remarks
    });

    if (matchingTeacherTopic.expected_marks) {
      reasons.push({
        icon: '🎯',
        text: `Expected marks: ${matchingTeacherTopic.expected_marks}`
      });
    }
  }

  // 2. Upcoming Exams Check
  const matchingExams = exams
    .filter(e => e.subject_id === topic.subject_id || (e.syllabus_notes && (e.syllabus_notes.toLowerCase().includes(topic.chapter_title?.toLowerCase() || '') || e.syllabus_notes.toLowerCase().includes(topic.title?.toLowerCase() || ''))))
    .sort((a, b) => a.days_remaining - b.days_remaining);

  if (matchingExams.length > 0) {
    const nextExam = matchingExams[0];
    const days = nextExam.days_remaining;
    if (days >= 0) {
      let examWeight = 0;
      if (days <= 3) examWeight = 42;
      else if (days <= 7) examWeight = 30;
      else if (days <= 14) examWeight = 18;
      else if (days <= 30) examWeight = 8;

      score += examWeight;
      reasons.push({
        icon: '📅',
        text: `Exam in ${days} day${days === 1 ? '' : 's'} (${nextExam.name})`
      });
    }
  }

  // 3. Current Mastery Check (Lower mastery = Higher urgency)
  const masteryScore = Number(topic.mastery || 0);
  const masteryWeight = Math.round((100 - masteryScore) * 0.35);
  score += masteryWeight;

  if (masteryScore < 60) {
    reasons.push({
      icon: '📉',
      text: `Current mastery: ${Math.round(masteryScore)}% (needs practice)`
    });
  }

  // 4. Backlog Status Check
  const inBacklog = backlogItems.find(b => 
    b.status === 'OPEN' && 
    (b.topic_id === topic.id || (b.chapter_id === topic.chapter_id && !b.topic_id))
  );

  if (inBacklog) {
    const backlogWeight = inBacklog.priority === 'HIGH' ? 30 : 20;
    score += backlogWeight;
    reasons.push({
      icon: '📐',
      text: `In active backlog (${inBacklog.priority} priority)`
    });
  }

  // 5. Homework Deadline Check
  const relatedHomework = homeworkItems.find(h => 
    h.status !== 'DONE' && 
    (h.topic_id === topic.id || h.chapter_id === topic.chapter_id)
  );

  if (relatedHomework) {
    score += 25;
    reasons.push({
      icon: '⏳',
      text: `Homework pending: "${relatedHomework.title}"`
    });
  }

  // 6. Previous Evaluation / Weak Areas Check
  const topicEvals = evaluations.filter(ev => ev.topic_id === topic.id);
  if (topicEvals.length > 0) {
    const avgScore = topicEvals.reduce((s, e) => s + (e.score || 0), 0) / topicEvals.length;
    if (avgScore < 70) {
      score += 15;
      reasons.push({
        icon: '⚠️',
        text: `Recent evaluation score: ${Math.round(avgScore)}% (weak areas identified)`
      });
    }
  }

  return {
    score: Math.min(Math.round(score), 100),
    tier: score >= 75 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW',
    reasons
  };
}

// Compute daily study budget based on day type and schedule
function calculateDayBudget(schedule, dayType = 'NORMAL_SCHOOL_DAY') {
  let baseMinutes = Number(schedule?.available_minutes) || 120;
  if (baseMinutes <= 0) baseMinutes = 120;

  let addedMinutes = 0;
  let label = 'Normal School Day';
  let sleepNotice = 'Sleep schedule protected (7.5+ hrs)';

  switch (dayType) {
    case 'HALF_DAY':
      addedMinutes = 90;
      label = 'Half Day (+90m study)';
      break;
    case 'HOLIDAY':
      addedMinutes = 150;
      label = 'Holiday (+150m study)';
      break;
    case 'SUNDAY':
      addedMinutes = 120;
      label = 'Sunday (+120m study)';
      break;
    case 'EXAM_DAY':
      addedMinutes = 60;
      label = 'Exam Day (Targeted Revision)';
      break;
    default:
      addedMinutes = 0;
      label = 'Normal School Day';
  }

  const totalCapacity = Math.min(baseMinutes + addedMinutes, 300); // capped at 5 hrs study to protect rest
  return {
    baseMinutes,
    addedMinutes,
    totalCapacity,
    dayType,
    label,
    sleepNotice
  };
}

// Format minutes into clean human-readable duration e.g. 4h 30m
function formatDuration(mins) {
  const m = Math.max(0, Number(mins) || 0);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0 && rem > 0) return `${h}h ${rem}m`;
  if (h > 0) return `${h}h`;
  return `${rem}m`;
}

// Calculate Smart Time Budget (Available, Allocated, Remaining, Buffer)
function calculateSmartBudget(totalCapacity, tasks = []) {
  const allocatedMinutes = tasks.reduce((sum, t) => sum + (Number(t.estimated_minutes) || 0), 0);
  
  // Provide 20-30 min transition/buffer if budget allows, otherwise use leftover
  const rawRemaining = Math.max(0, totalCapacity - allocatedMinutes);
  const bufferMinutes = Math.min(25, rawRemaining);
  const remainingMinutes = rawRemaining - bufferMinutes;

  return {
    availableMinutes: totalCapacity,
    allocatedMinutes,
    bufferMinutes,
    remainingMinutes: Math.max(0, remainingMinutes),
    formattedAvailable: formatDuration(totalCapacity),
    formattedAllocated: formatDuration(allocatedMinutes),
    formattedBuffer: formatDuration(bufferMinutes),
    formattedRemaining: formatDuration(Math.max(0, remainingMinutes))
  };
}

module.exports = {
  calculateTopicPriority,
  calculateDayBudget,
  calculateSmartBudget,
  formatDuration
};

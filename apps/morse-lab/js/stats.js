/**
 * Statistics & Progress Tracking
 * Persistent storage for learning progress, streaks, and analytics
 */

const STATS_KEY = 'morse_stats';
const SESSIONS_KEY = 'morse_sessions';
const DAILY_KEY = 'morse_daily';

function getDefaultStats() {
  return {
    totalSessions: 0,
    totalTime: 0,
    totalCorrect: 0,
    totalWrong: 0,
    bestStreak: 0,
    currentStreak: 0,
    lastSessionDate: null,
    characterStats: {},
    wpmHistory: [],
    accuracyHistory: [],
    achievements: [],
    createdAt: Date.now()
  };
}

function loadStats() {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (stored) {
      return { ...getDefaultStats(), ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
  return getDefaultStats();
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats:', e);
  }
}

function updateCharacterStat(stats, char, correct) {
  if (!stats.characterStats[char]) {
    stats.characterStats[char] = { correct: 0, wrong: 0, total: 0, lastSeen: null };
  }
  
  stats.characterStats[char].total++;
  if (correct) {
    stats.characterStats[char].correct++;
  } else {
    stats.characterStats[char].wrong++;
  }
  stats.characterStats[char].lastSeen = Date.now();
}

function recordSession(sessionData) {
  const stats = loadStats();
  
  stats.totalSessions++;
  stats.totalTime += sessionData.elapsed || 0;
  stats.totalCorrect += sessionData.correct || 0;
  stats.totalWrong += sessionData.wrong || 0;
  
  if (sessionData.bestStreak > stats.bestStreak) {
    stats.bestStreak = sessionData.bestStreak;
  }
  
  const today = new Date().toDateString();
  const lastDate = stats.lastSessionDate ? new Date(stats.lastSessionDate).toDateString() : null;
  
  if (lastDate === today) {
    // Same day, streak continues
  } else if (lastDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastDate === yesterday.toDateString()) {
      stats.currentStreak++;
    } else {
      stats.currentStreak = 1;
    }
  } else {
    stats.currentStreak = 1;
  }
  
  stats.lastSessionDate = Date.now();
  
  if (sessionData.attempts) {
    for (const attempt of sessionData.attempts) {
      if (attempt.item && attempt.item.length === 1) {
        updateCharacterStat(stats, attempt.item, attempt.correct);
      }
    }
  }
  
  const accuracy = sessionData.total > 0 ? 
    Math.round((sessionData.correct / sessionData.total) * 100) : 0;
  
  stats.wpmHistory.push({
    wpm: sessionData.wpm || 15,
    accuracy: accuracy,
    date: Date.now()
  });
  
  if (stats.wpmHistory.length > 100) {
    stats.wpmHistory = stats.wpmHistory.slice(-100);
  }
  
  checkAchievements(stats, sessionData);
  
  saveStats(stats);
  return stats;
}

function checkAchievements(stats, sessionData) {
  const achievements = [
    { id: 'first_session', name: 'First Steps', desc: 'Complete your first practice session', check: () => stats.totalSessions >= 1 },
    { id: 'ten_sessions', name: 'Dedicated Learner', desc: 'Complete 10 practice sessions', check: () => stats.totalSessions >= 10 },
    { id: 'fifty_sessions', name: 'Practice Makes Perfect', desc: 'Complete 50 practice sessions', check: () => stats.totalSessions >= 50 },
    { id: 'hundred_correct', name: 'Century Club', desc: 'Get 100 correct answers', check: () => stats.totalCorrect >= 100 },
    { id: 'five_hundred_correct', name: 'Half Millennium', desc: 'Get 500 correct answers', check: () => stats.totalCorrect >= 500 },
    { id: 'streak_10', name: 'On Fire', desc: 'Get a 10 answer streak', check: () => stats.bestStreak >= 10 },
    { id: 'streak_25', name: 'Unstoppable', desc: 'Get a 25 answer streak', check: () => stats.bestStreak >= 25 },
    { id: 'streak_50', name: 'Perfect Focus', desc: 'Get a 50 answer streak', check: () => stats.bestStreak >= 50 },
    { id: 'daily_3', name: 'Consistent', desc: 'Practice 3 days in a row', check: () => stats.currentStreak >= 3 },
    { id: 'daily_7', name: 'Week Warrior', desc: 'Practice 7 days in a row', check: () => stats.currentStreak >= 7 },
    { id: 'daily_30', name: 'Monthly Master', desc: 'Practice 30 days in a row', check: () => stats.currentStreak >= 30 },
    { id: 'perfect_10', name: 'Perfect Ten', desc: 'Get 10 correct in a row in one session', check: () => sessionData?.bestStreak >= 10 },
    { id: 'accuracy_90', name: 'Sharp Shooter', desc: 'Achieve 90% accuracy in a session (min 20 attempts)', 
      check: () => sessionData?.total >= 20 && (sessionData?.correct / sessionData?.total) >= 0.9 },
    { id: 'speed_demon', name: 'Speed Demon', desc: 'Practice at 20+ WPM', check: () => sessionData?.wpm >= 20 },
    { id: 'hour_practice', name: 'Hour of Power', desc: 'Accumulate 1 hour of practice time', check: () => stats.totalTime >= 3600 }
  ];
  
  for (const achievement of achievements) {
    if (!stats.achievements.includes(achievement.id) && achievement.check()) {
      stats.achievements.push(achievement.id);
    }
  }
}

function getAchievementsList() {
  return [
    { id: 'first_session', name: 'First Steps', desc: 'Complete your first practice session', icon: '🎯' },
    { id: 'ten_sessions', name: 'Dedicated Learner', desc: 'Complete 10 practice sessions', icon: '📚' },
    { id: 'fifty_sessions', name: 'Practice Makes Perfect', desc: 'Complete 50 practice sessions', icon: '🏆' },
    { id: 'hundred_correct', name: 'Century Club', desc: 'Get 100 correct answers', icon: '💯' },
    { id: 'five_hundred_correct', name: 'Half Millennium', desc: 'Get 500 correct answers', icon: '⭐' },
    { id: 'streak_10', name: 'On Fire', desc: 'Get a 10 answer streak', icon: '🔥' },
    { id: 'streak_25', name: 'Unstoppable', desc: 'Get a 25 answer streak', icon: '💪' },
    { id: 'streak_50', name: 'Perfect Focus', desc: 'Get a 50 answer streak', icon: '🧘' },
    { id: 'daily_3', name: 'Consistent', desc: 'Practice 3 days in a row', icon: '📅' },
    { id: 'daily_7', name: 'Week Warrior', desc: 'Practice 7 days in a row', icon: '🗓️' },
    { id: 'daily_30', name: 'Monthly Master', desc: 'Practice 30 days in a row', icon: '👑' },
    { id: 'perfect_10', name: 'Perfect Ten', desc: 'Get 10 correct in a row in one session', icon: '🎪' },
    { id: 'accuracy_90', name: 'Sharp Shooter', desc: 'Achieve 90% accuracy (min 20 attempts)', icon: '🎯' },
    { id: 'speed_demon', name: 'Speed Demon', desc: 'Practice at 20+ WPM', icon: '⚡' },
    { id: 'hour_practice', name: 'Hour of Power', desc: 'Accumulate 1 hour of practice', icon: '⏰' }
  ];
}

function getWeakCharacters(stats) {
  if (!stats || !stats.characterStats) return [];
  
  const weak = [];
  for (const [char, data] of Object.entries(stats.characterStats)) {
    const accuracy = data.total > 0 ? data.correct / data.total : 0;
    if (data.total >= 3 && accuracy < 0.7) {
      weak.push({ char, accuracy: Math.round(accuracy * 100), total: data.total });
    }
  }
  
  return weak.sort((a, b) => a.accuracy - b.accuracy).slice(0, 10);
}

function getStrongCharacters(stats) {
  if (!stats || !stats.characterStats) return [];
  
  const strong = [];
  for (const [char, data] of Object.entries(stats.characterStats)) {
    const accuracy = data.total > 0 ? data.correct / data.total : 0;
    if (data.total >= 5 && accuracy >= 0.9) {
      strong.push({ char, accuracy: Math.round(accuracy * 100), total: data.total });
    }
  }
  
  return strong.sort((a, b) => b.accuracy - a.accuracy).slice(0, 10);
}

function getProgressSummary(stats) {
  const avgWpm = stats.wpmHistory.length > 0 ?
    Math.round(stats.wpmHistory.reduce((a, b) => a + b.wpm, 0) / stats.wpmHistory.length) : 0;
  
  const recentAccuracy = stats.wpmHistory.slice(-10);
  const avgAccuracy = recentAccuracy.length > 0 ?
    Math.round(recentAccuracy.reduce((a, b) => a + b.accuracy, 0) / recentAccuracy.length) : 0;
  
  const totalAttempts = stats.totalCorrect + stats.totalWrong;
  const overallAccuracy = totalAttempts > 0 ?
    Math.round((stats.totalCorrect / totalAttempts) * 100) : 0;
  
  return {
    totalSessions: stats.totalSessions,
    totalTime: stats.totalTime,
    totalCorrect: stats.totalCorrect,
    totalAttempts: totalAttempts,
    overallAccuracy: overallAccuracy,
    avgWpm: avgWpm,
    recentAccuracy: avgAccuracy,
    bestStreak: stats.bestStreak,
    currentDailyStreak: stats.currentStreak,
    achievementsUnlocked: stats.achievements.length,
    weakCharacters: getWeakCharacters(stats),
    strongCharacters: getStrongCharacters(stats)
  };
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function resetStats() {
  const stats = getDefaultStats();
  saveStats(stats);
  return stats;
}

export {
  loadStats,
  saveStats,
  recordSession,
  getAchievementsList,
  getWeakCharacters,
  getStrongCharacters,
  getProgressSummary,
  formatTime,
  resetStats
};

/**
 * Practice Mode - Morse Code Training System
 * Includes drills, listen & type, adaptive learning
 */

import { MORSE_MAP, textToMorse, getMorseSequence, getTotalDuration, getUnitDuration } from './morse.js';
import { renderMorseAudio, playAudioBuffer, stopPlayback, getAudioSamples } from './audio.js';

const DIFFICULTY_LEVELS = {
  beginner: {
    name: 'Beginner',
    chars: 'ETAOINSHRDLU'.split(''),
    minWpm: 5,
    maxWpm: 10
  },
  intermediate: {
    name: 'Intermediate', 
    chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    minWpm: 10,
    maxWpm: 18
  },
  advanced: {
    name: 'Advanced',
    chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''),
    minWpm: 15,
    maxWpm: 25
  },
  expert: {
    name: 'Expert',
    chars: Object.keys(MORSE_MAP),
    minWpm: 20,
    maxWpm: 30
  }
};

const DRILL_TYPES = {
  characters: { name: 'Single Characters', description: 'Practice individual letters and numbers' },
  words: { name: 'Common Words', description: 'Practice frequently used words' },
  callsigns: { name: 'Call Signs', description: 'Practice ham radio call signs' },
  sentences: { name: 'Sentences', description: 'Practice full sentences' },
  listenType: { name: 'Listen & Type', description: 'Hear Morse and type what you hear' }
};

const COMMON_WORDS = [
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER',
  'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'HAD', 'HAS', 'HIS', 'HOW', 'ITS',
  'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO', 'BOY', 'DID', 'GET',
  'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'HELP', 'SEND', 'COPY', 'OVER',
  'ROGER', 'HELLO', 'WORLD', 'RADIO', 'MORSE', 'CODE', 'TEST', 'CALL'
];

const SAMPLE_CALLSIGNS = [
  'W1AW', 'K2ABC', 'N3XYZ', 'WA4DEF', 'KB5GHI', 'W6JKL', 'N7MNO', 'K8PQR',
  'WB9STU', 'KC0VWX', 'VE3ABC', 'G4DEF', 'JA1XYZ', 'DL2ABC', 'F5DEF'
];

const SAMPLE_SENTENCES = [
  'CQ CQ CQ DE W1AW',
  'THE QUICK BROWN FOX',
  'HELLO WORLD',
  'SOS SOS SOS',
  'QTH IS NEW YORK',
  'RST 599 599',
  'TNX FER QSO',
  'GL ES 73',
  'WEATHER IS GOOD',
  'COPY ALL OK'
];

class PracticeSession {
  constructor(options = {}) {
    this.difficulty = options.difficulty || 'beginner';
    this.drillType = options.drillType || 'characters';
    this.wpm = options.wpm || DIFFICULTY_LEVELS[this.difficulty].minWpm;
    this.frequency = options.frequency || 600;
    this.volume = options.volume || 1;
    this.farnsworthWpm = options.farnsworthWpm || null;
    
    this.currentItem = null;
    this.attempts = [];
    this.startTime = null;
    this.isActive = false;
    this.playback = null;
    this.totalCorrect = 0;
    this.totalWrong = 0;
    this.streak = 0;
    this.bestStreak = 0;
    
    this.onUpdate = options.onUpdate || (() => {});
    this.onComplete = options.onComplete || (() => {});
  }

  getNextItem() {
    const level = DIFFICULTY_LEVELS[this.difficulty];
    let item;

    switch (this.drillType) {
      case 'characters':
        item = level.chars[Math.floor(Math.random() * level.chars.length)];
        break;
      case 'words':
        const filteredWords = COMMON_WORDS.filter(w => 
          w.split('').every(c => level.chars.includes(c))
        );
        item = filteredWords[Math.floor(Math.random() * filteredWords.length)] || 'TEST';
        break;
      case 'callsigns':
        item = SAMPLE_CALLSIGNS[Math.floor(Math.random() * SAMPLE_CALLSIGNS.length)];
        break;
      case 'sentences':
        item = SAMPLE_SENTENCES[Math.floor(Math.random() * SAMPLE_SENTENCES.length)];
        break;
      case 'listenType':
        const items = this.difficulty === 'beginner' ? level.chars : 
          [...level.chars, ...COMMON_WORDS.slice(0, 20)];
        item = items[Math.floor(Math.random() * items.length)];
        break;
      default:
        item = level.chars[Math.floor(Math.random() * level.chars.length)];
    }

    return item;
  }

  async start() {
    this.isActive = true;
    this.startTime = Date.now();
    this.attempts = [];
    this.totalCorrect = 0;
    this.totalWrong = 0;
    this.streak = 0;
    await this.nextRound();
  }

  async nextRound() {
    if (!this.isActive) return;
    
    this.currentItem = this.getNextItem();
    this.onUpdate({
      type: 'newRound',
      item: this.currentItem,
      morse: textToMorse(this.currentItem),
      isListenMode: this.drillType === 'listenType',
      stats: this.getStats()
    });

    if (this.drillType === 'listenType') {
      await this.playCurrentItem();
    }
  }

  async playCurrentItem() {
    if (!this.currentItem) return;
    
    try {
      const buffer = await renderMorseAudio(this.currentItem, {
        wpm: this.wpm,
        frequency: this.frequency,
        farnsworthWpm: this.farnsworthWpm,
        volume: this.volume
      });
      
      if (this.playback) {
        stopPlayback(this.playback);
      }
      
      this.playback = playAudioBuffer(buffer, this.volume);
      return new Promise(resolve => {
        this.playback.source.onended = resolve;
      });
    } catch (err) {
      console.error('Failed to play audio:', err);
    }
  }

  checkAnswer(answer) {
    if (!this.currentItem || !this.isActive) return null;
    
    const correct = answer.toUpperCase().trim() === this.currentItem.toUpperCase().trim();
    const attempt = {
      item: this.currentItem,
      answer: answer,
      correct: correct,
      timestamp: Date.now(),
      responseTime: Date.now() - (this.attempts.length > 0 ? 
        this.attempts[this.attempts.length - 1].timestamp : this.startTime)
    };
    
    this.attempts.push(attempt);
    
    if (correct) {
      this.totalCorrect++;
      this.streak++;
      if (this.streak > this.bestStreak) {
        this.bestStreak = this.streak;
      }
    } else {
      this.totalWrong++;
      this.streak = 0;
    }
    
    this.onUpdate({
      type: 'answer',
      correct: correct,
      expected: this.currentItem,
      given: answer,
      stats: this.getStats()
    });
    
    return correct;
  }

  getStats() {
    const total = this.totalCorrect + this.totalWrong;
    const accuracy = total > 0 ? Math.round((this.totalCorrect / total) * 100) : 0;
    const elapsed = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    
    return {
      correct: this.totalCorrect,
      wrong: this.totalWrong,
      total: total,
      accuracy: accuracy,
      streak: this.streak,
      bestStreak: this.bestStreak,
      elapsed: elapsed,
      wpm: this.wpm
    };
  }

  stop() {
    this.isActive = false;
    if (this.playback) {
      stopPlayback(this.playback);
      this.playback = null;
    }
    
    const stats = this.getStats();
    this.onComplete(stats);
    return stats;
  }

  setWpm(wpm) {
    this.wpm = Math.max(5, Math.min(35, wpm));
  }

  setDifficulty(difficulty) {
    if (DIFFICULTY_LEVELS[difficulty]) {
      this.difficulty = difficulty;
    }
  }

  setDrillType(type) {
    if (DRILL_TYPES[type]) {
      this.drillType = type;
    }
  }
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

function generateAdaptiveDrill(stats, difficulty = 'intermediate') {
  const weak = getWeakCharacters(stats);
  const level = DIFFICULTY_LEVELS[difficulty];
  
  if (weak.length === 0) {
    return level.chars;
  }
  
  const weakChars = weak.map(w => w.char);
  const normalChars = level.chars.filter(c => !weakChars.includes(c));
  
  const drill = [];
  for (let i = 0; i < 20; i++) {
    if (Math.random() < 0.6 && weakChars.length > 0) {
      drill.push(weakChars[Math.floor(Math.random() * weakChars.length)]);
    } else {
      drill.push(normalChars[Math.floor(Math.random() * normalChars.length)]);
    }
  }
  
  return drill;
}

export {
  PracticeSession,
  DIFFICULTY_LEVELS,
  DRILL_TYPES,
  COMMON_WORDS,
  SAMPLE_CALLSIGNS,
  SAMPLE_SENTENCES,
  getWeakCharacters,
  generateAdaptiveDrill
};

/**
 * Morse Code Engine - ITU-R M.1677-1 International Morse Code
 * Text ↔ Morse conversion with PARIS timing standard
 */

// Full character map: letter/number/punctuation → Morse
const MORSE_MAP = {
  // Letters A-Z
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  // Numbers 0-9
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....',
  6: '-....', 7: '--...', 8: '---..', 9: '----.',
  // Punctuation
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.',
  '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
  '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
  '+': '.-.-.', '-': '-....-', '"': '.-..-.', '$': '...-..-',
  '@': '.--.-.'
};

// Reverse map: Morse → character (for decode)
const REVERSE_MAP = {};
for (const [char, code] of Object.entries(MORSE_MAP)) {
  REVERSE_MAP[code] = char;
}

// PARIS = 50 units (standard word for WPM)
const PARIS_UNITS = 50;

/**
 * Get unit duration in seconds for given WPM
 * PARIS × WPM = units per minute → unitSec = 60 / (50 * wpm)
 */
function getUnitDuration(wpm) {
  return 60 / (PARIS_UNITS * wpm);
}

/**
 * Convert text to Morse code string (dots and dashes with spaces)
 * @param {string} text - Input text
 * @returns {string} Morse display string
 */
function textToMorse(text) {
  if (!text || typeof text !== 'string') return '';

  const trimmed = text.trim().toUpperCase();
  const chars = [];

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (char === ' ') {
      chars.push(' / ');
      continue;
    }

    const code = MORSE_MAP[char];
    if (code) {
      const parts = code.split('').map(s => (s === '.' ? '·' : '−'));
      chars.push(parts.join(''));
    }
  }

  return chars.join(' ');
}

/**
 * Get raw Morse sequence for audio: dots, dashes, and gap markers
 */
function getMorseSequence(text) {
  if (!text || typeof text !== 'string') return [];

  const trimmed = text.trim().toUpperCase();
  const seq = [];

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (char === ' ') {
      seq.push({ type: 'word' });
      continue;
    }

    const code = MORSE_MAP[char];
    if (code) {
      for (let j = 0; j < code.length; j++) {
        seq.push({ type: code[j] === '.' ? 'dot' : 'dash' });
        if (j < code.length - 1) seq.push({ type: 'symbol' });
      }
      if (i < trimmed.length - 1 && trimmed[i + 1] !== ' ') {
        seq.push({ type: 'letter' });
      }
    }
  }

  return seq;
}

/**
 * Convert Morse string back to text
 * @param {string} morse - Morse code (dots, dashes, spaces)
 * @returns {string} Decoded text
 */
function morseToText(morse) {
  if (!morse || typeof morse !== 'string') return '';

  const normalized = morse
    .replace(/·/g, '.')
    .replace(/−/g, '-')
    .trim();

  const words = normalized.split(/\s+\/\s+|\s{2,}/);
  const result = [];

  for (const word of words) {
    const letters = word.split(/\s+/).filter(Boolean);
    let wordText = '';
    for (const letter of letters) {
      const char = REVERSE_MAP[letter];
      if (char) wordText += char;
    }
    if (wordText) result.push(wordText);
  }

  return result.join(' ');
}

/**
 * Calculate total duration in seconds for a Morse sequence
 */
function getTotalDuration(sequence, wpm, farnsworthWpm = null) {
  const unitSec = getUnitDuration(wpm);
  const spaceWpm = farnsworthWpm || wpm;
  const spaceUnitSec = getUnitDuration(spaceWpm);

  let duration = 0;

  for (const item of sequence) {
    switch (item.type) {
      case 'dot':
        duration += unitSec;
        break;
      case 'dash':
        duration += unitSec * 3;
        break;
      case 'symbol':
        duration += unitSec;
        break;
      case 'letter':
        duration += farnsworthWpm ? spaceUnitSec * 3 : unitSec * 3;
        break;
      case 'word':
        duration += farnsworthWpm ? spaceUnitSec * 7 : unitSec * 7;
        break;
    }
  }

  return duration;
}

// SOS constant for quick access
const SOS_MORSE = '··· --- ···';
const SOS_TEXT = 'SOS';

// Quick presets for common Morse signals
const QUICK_PRESETS = {
  SOS: 'SOS',
  CQ: 'CQ',
  CQD: 'CQD',
  DE: 'DE',
  K: 'K',
  AR: 'AR',
  SK: 'SK'
};

// Extended preset packs by category
const PRESET_PACKS = {
  emergency: {
    name: 'Emergency',
    icon: '🆘',
    presets: {
      'SOS': 'SOS',
      'MAYDAY': 'MAYDAY',
      'PAN PAN': 'PAN PAN',
      'HELP': 'HELP',
      'URGENT': 'URGENT',
      '911': '911'
    }
  },
  hamRadio: {
    name: 'Ham Radio',
    icon: '📻',
    presets: {
      'CQ': 'CQ CQ CQ',
      'DE': 'DE',
      'K': 'K',
      'AR': 'AR',
      'SK': 'SK',
      'QTH': 'QTH',
      'QSL': 'QSL',
      'RST': 'RST 599',
      '73': '73',
      '88': '88',
      'QRZ': 'QRZ',
      'QRM': 'QRM',
      'QRN': 'QRN',
      'QSB': 'QSB',
      'TNX': 'TNX FER QSO',
      'GL': 'GL ES 73'
    }
  },
  aviation: {
    name: 'Aviation',
    icon: '✈️',
    presets: {
      'MAYDAY': 'MAYDAY MAYDAY MAYDAY',
      'PAN': 'PAN PAN PAN',
      'WILCO': 'WILCO',
      'ROGER': 'ROGER',
      'AFFIRM': 'AFFIRM',
      'NEGATIVE': 'NEGATIVE',
      'OVER': 'OVER',
      'OUT': 'OUT',
      'SQUAWK': 'SQUAWK 7700'
    }
  },
  maritime: {
    name: 'Maritime',
    icon: '⚓',
    presets: {
      'SOS': 'SOS SOS SOS',
      'CQD': 'CQD CQD CQD',
      'MAYDAY': 'MAYDAY',
      'PAN PAN': 'PAN PAN',
      'SECURITE': 'SECURITE',
      'MAN OVERBOARD': 'MAN OVERBOARD',
      'ABANDON SHIP': 'ABANDON SHIP'
    }
  },
  greetings: {
    name: 'Greetings',
    icon: '👋',
    presets: {
      'HELLO': 'HELLO',
      'HI': 'HI',
      'GOODBYE': 'GOODBYE',
      'GM': 'GOOD MORNING',
      'GE': 'GOOD EVENING',
      'GN': 'GOOD NIGHT',
      'THANKS': 'THANK YOU',
      'WELCOME': 'WELCOME'
    }
  },
  practice: {
    name: 'Practice',
    icon: '📝',
    presets: {
      'PARIS': 'PARIS',
      'QUICK FOX': 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG',
      'ABC': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      '123': '1234567890',
      'EISH': 'EISH',
      'TMO': 'TMO'
    }
  }
};

export {
  MORSE_MAP,
  REVERSE_MAP,
  QUICK_PRESETS,
  PRESET_PACKS,
  getUnitDuration,
  textToMorse,
  getMorseSequence,
  morseToText,
  getTotalDuration,
  SOS_MORSE,
  SOS_TEXT,
  PARIS_UNITS
};

/**
 * Morse Code Audio Generator
 * Web Audio API - OfflineAudioContext, OscillatorNode, GainNode
 * Advanced controls: wave shape, envelope, noise floor
 */

import { getMorseSequence, getUnitDuration, getTotalDuration } from './morse.js';

const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_FREQUENCY = 600;
const DEFAULT_WPM = 15;

// Audio profile presets
const AUDIO_PROFILES = {
  clean: {
    name: 'Clean Tone',
    waveType: 'sine',
    attack: 0.005,
    decay: 0.005,
    noiseLevel: 0,
    description: 'Pure sine wave, no noise'
  },
  radio: {
    name: 'Radio Style',
    waveType: 'sine',
    attack: 0.008,
    decay: 0.008,
    noiseLevel: 0.02,
    description: 'Simulates radio transmission'
  },
  hamRadio: {
    name: 'HAM Radio',
    waveType: 'sine',
    attack: 0.006,
    decay: 0.006,
    noiseLevel: 0.035,
    description: 'Realistic amateur radio with static'
  },
  telegraph: {
    name: 'Telegraph',
    waveType: 'square',
    attack: 0.002,
    decay: 0.002,
    noiseLevel: 0.01,
    description: 'Sharp telegraph-style beeps'
  },
  soft: {
    name: 'Soft Tone',
    waveType: 'sine',
    attack: 0.02,
    decay: 0.02,
    noiseLevel: 0,
    description: 'Gentle attack and decay'
  },
  cw: {
    name: 'CW Operator',
    waveType: 'sine',
    attack: 0.004,
    decay: 0.004,
    noiseLevel: 0.005,
    description: 'Classic CW sound'
  },
  harsh: {
    name: 'Harsh',
    waveType: 'sawtooth',
    attack: 0.001,
    decay: 0.001,
    noiseLevel: 0,
    description: 'Sharp sawtooth wave'
  }
};

/**
 * Create OfflineAudioContext for rendering Morse audio
 */
function createOfflineContext(durationSeconds, sampleRate = DEFAULT_SAMPLE_RATE) {
  const length = Math.ceil(durationSeconds * sampleRate);
  const AudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  return new AudioContextClass(1, length, sampleRate);
}

/**
 * Generate white noise buffer
 */
function createNoiseBuffer(ctx, duration) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Schedule Morse tones with advanced envelope
 */
function scheduleMorseTones(ctx, sequence, options = {}) {
  const {
    wpm = DEFAULT_WPM,
    frequency = DEFAULT_FREQUENCY,
    farnsworthWpm = null,
    volume = 1,
    waveType = 'sine',
    attack = 0.005,
    decay = 0.005,
    noiseLevel = 0
  } = options;

  const unitSec = getUnitDuration(wpm);
  const spaceUnitSec = farnsworthWpm ? getUnitDuration(farnsworthWpm) : unitSec;
  const gainValue = Math.max(0, Math.min(1, volume)) * 0.8;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = waveType;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = 0;

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(0);

  let time = 0;

  for (const item of sequence) {
    switch (item.type) {
      case 'dot': {
        const duration = unitSec;
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(gainValue, time + Math.min(attack, duration / 2));
        gainNode.gain.setValueAtTime(gainValue, time + duration - Math.min(decay, duration / 2));
        gainNode.gain.linearRampToValueAtTime(0, time + duration);
        time += duration;
        break;
      }

      case 'dash': {
        const duration = unitSec * 3;
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(gainValue, time + Math.min(attack, duration / 4));
        gainNode.gain.setValueAtTime(gainValue, time + duration - Math.min(decay, duration / 4));
        gainNode.gain.linearRampToValueAtTime(0, time + duration);
        time += duration;
        break;
      }

      case 'symbol':
        time += unitSec;
        break;

      case 'letter':
        time += farnsworthWpm ? spaceUnitSec * 3 : unitSec * 3;
        break;

      case 'word':
        time += farnsworthWpm ? spaceUnitSec * 7 : unitSec * 7;
        break;
    }
  }

  oscillator.stop(time + 0.01);

  // Add noise if specified
  if (noiseLevel > 0 && time > 0) {
    const noiseBuffer = createNoiseBuffer(ctx, time + 0.1);
    const noiseSource = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    noiseSource.buffer = noiseBuffer;
    noiseGain.gain.value = noiseLevel * volume;
    noiseSource.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(0);
    noiseSource.stop(time + 0.01);
  }
}

/**
 * Render Morse code audio to an AudioBuffer
 * @param {string} text - Input text
 * @param {Object} options - { wpm, frequency, farnsworthWpm, waveType, attack, decay, noiseLevel }
 * @returns {Promise<AudioBuffer>}
 */
export async function renderMorseAudio(text, options = {}) {
  const sequence = getMorseSequence(text);
  if (sequence.length === 0) {
    throw new Error('No valid Morse sequence');
  }

  const duration = getTotalDuration(
    sequence,
    options.wpm ?? DEFAULT_WPM,
    options.farnsworthWpm ?? null
  );

  const sampleRate = DEFAULT_SAMPLE_RATE;
  const ctx = createOfflineContext(duration + 0.1, sampleRate);

  scheduleMorseTones(ctx, sequence, options);

  const buffer = await ctx.startRendering();
  return buffer;
}

/**
 * Play AudioBuffer through speakers with optional loop and playback rate
 * @param {AudioBuffer} buffer
 * @param {number} volume - 0 to 1
 * @param {Object} options - { loop, playbackRate }
 */
export function playAudioBuffer(buffer, volume = 1, options = {}) {
  const { loop = false, playbackRate = 1 } = options;
  
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContextClass();
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  
  gainNode.gain.value = Math.max(0, Math.min(1, volume));
  source.buffer = buffer;
  source.loop = loop;
  source.playbackRate.value = playbackRate;
  
  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start(0);
  
  return { ctx, source, gainNode };
}

/**
 * Stop playback
 */
export function stopPlayback(playback) {
  if (playback?.source) {
    try {
      playback.source.stop();
    } catch (_) {}
  }
  if (playback?.ctx) {
    playback.ctx.close();
  }
}

/**
 * Adjust volume during playback
 */
export function setPlaybackVolume(playback, volume) {
  if (playback?.gainNode) {
    playback.gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }
}

/**
 * Get raw Float32 samples from AudioBuffer (mono)
 */
export function getAudioSamples(buffer) {
  return buffer.getChannelData(0);
}

/**
 * Get audio profile by name
 */
export function getAudioProfile(name) {
  return AUDIO_PROFILES[name] || AUDIO_PROFILES.clean;
}

/**
 * Get all available audio profiles
 */
export function getAudioProfiles() {
  return AUDIO_PROFILES;
}

export { DEFAULT_SAMPLE_RATE, DEFAULT_FREQUENCY, DEFAULT_WPM, AUDIO_PROFILES };

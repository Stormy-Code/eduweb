/**
 * Morse Code App - Main orchestration
 * Full-featured Morse code encoder, decoder, and trainer
 */

import { textToMorse, morseToText, MORSE_MAP, QUICK_PRESETS, PRESET_PACKS } from './morse.js';
import { renderMorseAudio, playAudioBuffer, stopPlayback, getAudioSamples, getAudioProfile, getAudioProfiles, DEFAULT_WPM, DEFAULT_FREQUENCY } from './audio.js';
import { encodeToMp3, encodeToWav, downloadBlob, shareMorse, parseShareableUrl, generateQRCode, downloadQRCode, createShareableUrl, exportWaveformPng } from './export.js';
import { PracticeSession, DIFFICULTY_LEVELS, DRILL_TYPES } from './practice.js';
import { loadStats, recordSession, getProgressSummary, getAchievementsList, formatTime, resetStats, getWeakCharacters } from './stats.js';

const STORAGE_KEYS = {
  theme: 'morse_theme',
  wpm: 'morse_wpm',
  freq: 'morse_freq',
  farnsworth: 'morse_farnsworth',
  volume: 'morse_volume',
  exportFormat: 'morse_export_format',
  history: 'morse_history',
  audioProfile: 'morse_audio_profile',
  loopPlayback: 'morse_loop',
  presetPack: 'morse_preset_pack'
};

const CHAR_LIMIT = 500;
const HISTORY_MAX = 20;
const TOAST_DURATION = 3000;

let currentPlayback = null;
let cachedBuffer = null;
let cachedOptions = null;
let currentSession = null;
let deferredInstallPrompt = null;

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => el.querySelectorAll(sel);

// ============== UTILITY FUNCTIONS ==============

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), TOAST_DURATION);
}

function getState() {
  const vol = parseInt($('#vol-slider')?.value || 100, 10);
  const profile = getAudioProfile($('#audio-profile')?.value || 'cw');
  
  return {
    wpm: parseInt($('#wpm-slider')?.value || DEFAULT_WPM, 10),
    frequency: parseInt($('#freq-slider')?.value || DEFAULT_FREQUENCY, 10),
    farnsworthWpm: $('#farnsworth')?.checked ? 5 : null,
    volume: Math.max(0, Math.min(100, vol)) / 100,
    waveType: profile.waveType,
    attack: profile.attack,
    decay: profile.decay,
    noiseLevel: profile.noiseLevel,
    loop: $('#loop-playback')?.checked || false
  };
}

function setLoading(show, text = 'Generating...') {
  const overlay = $('#loading-overlay');
  const loadingText = $('#loading-text');
  if (overlay) {
    overlay.hidden = !show;
    overlay.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  if (loadingText) loadingText.textContent = text;
}

// ============== ENCODE PANEL ==============

function updateUI() {
  const text = $('#text-input')?.value?.trim() || '';
  const hasContent = text.length > 0;

  $('#char-count').textContent = text.length;
  $('#play-btn').disabled = !hasContent;
  $('#download-btn').disabled = !hasContent;
  $('#share-btn').disabled = !hasContent;
  $('#copy-morse-btn').disabled = !hasContent;
  $('#qr-btn').disabled = !hasContent;

  const morse = textToMorse(text);
  const preview = $('#morse-preview');
  if (preview) {
    const placeholder = preview.querySelector('.morse-placeholder');
    let contentSpan = preview.querySelector('.morse-content');
    preview.classList.toggle('has-content', !!morse);
    if (morse) {
      if (!contentSpan) {
        contentSpan = document.createElement('span');
        contentSpan.className = 'morse-content';
        placeholder ? placeholder.after(contentSpan) : preview.appendChild(contentSpan);
      }
      contentSpan.textContent = morse;
    } else {
      contentSpan?.remove();
    }
  }

  $('#wpm-value').textContent = getState().wpm;
  $('#freq-value').textContent = getState().frequency;
  $('#vol-value').textContent = Math.round((getState().volume || 1) * 100);

  const waveformWrap = $('#waveform-wrap');
  if (waveformWrap) waveformWrap.hidden = !hasContent || !cachedBuffer;
}

function updateDecodePanel() {
  const morse = $('#morse-input')?.value?.trim() || '';
  const decoded = morse ? morseToText(morse) : '';
  const result = $('#decode-result');
  
  $('#copy-decoded-btn').disabled = !decoded;
  $('#play-decoded-btn').disabled = !decoded;
  
  if (result) {
    const placeholder = result.querySelector('.morse-placeholder');
    let contentSpan = result.querySelector('.decode-content');
    result.classList.toggle('has-content', !!decoded);
    if (decoded) {
      if (!contentSpan) {
        contentSpan = document.createElement('span');
        contentSpan.className = 'decode-content';
        placeholder ? placeholder.after(contentSpan) : result.appendChild(contentSpan);
      }
      contentSpan.textContent = decoded;
    } else {
      contentSpan?.remove();
    }
  }
}

async function ensureBuffer(text = null) {
  const inputText = text || $('#text-input')?.value?.trim() || '';
  if (!inputText) return null;

  const opts = getState();
  const cacheKey = JSON.stringify({ text: inputText, ...opts });
  if (cachedBuffer && cachedOptions === cacheKey) {
    return cachedBuffer;
  }

  setLoading(true, 'Generating audio...');
  try {
    const buffer = await renderMorseAudio(inputText, opts);
    if (!text) {
      cachedBuffer = buffer;
      cachedOptions = cacheKey;
      renderWaveform(buffer);
    }
    return buffer;
  } finally {
    setLoading(false);
  }
}

function renderWaveform(buffer) {
  const wrap = $('#waveform-wrap');
  const canvas = $('#waveform-canvas');
  if (!wrap || !canvas || !buffer) return;
  
  const samples = getAudioSamples(buffer);
  if (!samples.length) return;
  
  wrap.hidden = false;
  const w = wrap.offsetWidth || 600;
  const h = 64;
  canvas.width = w;
  canvas.height = h;
  
  const ctx = canvas.getContext('2d');
  const mid = h / 2;
  
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-tertiary').trim() || '#1f1f23';
  ctx.fillRect(0, 0, w, h);
  
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  
  const step = Math.ceil(samples.length / w);
  for (let x = 0; x < w; x++) {
    const i = Math.min(Math.floor(x * step), samples.length - 1);
    const y = mid - samples[i] * (mid - 4);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

async function handlePlay() {
  const icon = $('#play-btn')?.querySelector('.btn-icon');
  const textEl = $('#play-btn')?.querySelector('.btn-text');
  const loop = $('#loop-playback')?.checked || false;

  if (currentPlayback) {
    stopPlayback(currentPlayback);
    currentPlayback = null;
    if (icon) icon.textContent = '▶';
    if (textEl) textEl.textContent = 'Play';
    return;
  }

  const buffer = await ensureBuffer();
  if (!buffer) return;

  try {
    const vol = getState().volume ?? 1;
    currentPlayback = playAudioBuffer(buffer, vol, { loop });
    if (icon) icon.textContent = '■';
    if (textEl) textEl.textContent = 'Stop';

    if (!loop) {
      currentPlayback.source.onended = () => {
        currentPlayback = null;
        if (icon) icon.textContent = '▶';
        if (textEl) textEl.textContent = 'Play';
      };
    }
    addToHistory($('#text-input')?.value?.trim() || '');
  } catch (err) {
    console.error(err);
    showToast('Playback failed', 'error');
  }
}

async function handleDownload() {
  const text = $('#text-input')?.value?.trim() || '';
  if (!text) return;

  const wantWav = $('#export-wav')?.checked;
  setLoading(true, wantWav ? 'Encoding WAV...' : 'Encoding MP3...');
  try {
    const buffer = await ensureBuffer();
    if (!buffer) return;

    let blob;
    let ext = wantWav ? 'wav' : 'mp3';
    if (wantWav) {
      blob = encodeToWav(buffer);
    } else {
      try {
        blob = encodeToMp3(buffer);
      } catch (_) {
        blob = encodeToWav(buffer);
        ext = 'wav';
      }
    }

    const slug = text.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-') || 'morse';
    downloadBlob(blob, `morse-${slug}.${ext}`);
    showToast(`Downloaded as ${ext.toUpperCase()}`, 'success');
    addToHistory(text);
  } finally {
    setLoading(false);
  }
}

async function handleShare() {
  const text = $('#text-input')?.value?.trim() || '';
  if (!text) return;

  const morse = textToMorse(text);
  let mp3Blob = null;

  setLoading(true, 'Preparing share...');
  try {
    const buffer = await ensureBuffer();
    if (buffer) {
      try {
        mp3Blob = encodeToMp3(buffer);
      } catch (_) {}
    }

    const usedNative = await shareMorse(text, morse, mp3Blob);
    if (!usedNative) {
      showToast('Copied to clipboard!', 'success');
    }
    addToHistory(text);
  } catch (err) {
    console.error(err);
    showToast('Share failed. Try copying manually.', 'error');
  } finally {
    setLoading(false);
  }
}

function handleQRCode() {
  const text = $('#text-input')?.value?.trim() || '';
  if (!text) return;

  const modal = $('#qr-modal');
  const container = $('#qr-container');
  const textEl = $('#qr-text');
  
  if (modal && container) {
    container.innerHTML = '';
    const canvas = generateQRCode(text, 200);
    container.appendChild(canvas);
    if (textEl) textEl.textContent = text.length > 50 ? text.slice(0, 47) + '...' : text;
    modal.hidden = false;
  }
}

async function handleCopyMorse() {
  const text = $('#text-input')?.value?.trim() || '';
  if (!text) return;
  const morse = textToMorse(text);
  try {
    await navigator.clipboard.writeText(morse);
    showToast('Morse code copied', 'success');
  } catch (_) {
    showToast('Copy failed', 'error');
  }
}

function handleWaveformExport() {
  const canvas = $('#waveform-canvas');
  if (canvas) {
    exportWaveformPng(canvas, 'morse-waveform.png');
    showToast('Waveform exported', 'success');
  }
}

// ============== DECODE PANEL ==============

async function handleCopyDecoded() {
  const decoded = morseToText($('#morse-input')?.value?.trim() || '');
  if (!decoded) return;
  try {
    await navigator.clipboard.writeText(decoded);
    showToast('Text copied', 'success');
  } catch (_) {
    showToast('Copy failed', 'error');
  }
}

async function handlePlayDecoded() {
  const decoded = morseToText($('#morse-input')?.value?.trim() || '');
  if (!decoded) return;
  
  try {
    const buffer = await ensureBuffer(decoded);
    if (!buffer) return;
    
    if (currentPlayback) {
      stopPlayback(currentPlayback);
    }
    
    const vol = getState().volume ?? 1;
    currentPlayback = playAudioBuffer(buffer, vol);
    currentPlayback.source.onended = () => {
      currentPlayback = null;
    };
  } catch (err) {
    console.error(err);
    showToast('Playback failed', 'error');
  }
}

// ============== PRESETS ==============

function handlePreset(key, packId) {
  const pack = PRESET_PACKS[packId];
  const text = pack?.presets?.[key] || QUICK_PRESETS[key];
  if (!text) return;
  
  const input = $('#text-input');
  if (input) {
    const cur = input.value.trim();
    input.value = cur ? `${cur} ${text}` : text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function initPresets() {
  const tabsContainer = $('#preset-tabs');
  const presetsRow = $('#presets-row');
  if (!tabsContainer || !presetsRow) return;

  // Load saved preset pack
  const savedPack = localStorage.getItem(STORAGE_KEYS.presetPack) || 'hamRadio';
  
  // Create pack tabs
  tabsContainer.innerHTML = '';
  for (const [packId, pack] of Object.entries(PRESET_PACKS)) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = `preset-tab ${packId === savedPack ? 'active' : ''}`;
    tab.dataset.pack = packId;
    tab.innerHTML = `<span class="preset-tab-icon">${pack.icon}</span><span class="preset-tab-name">${pack.name}</span>`;
    tab.addEventListener('click', () => selectPresetPack(packId));
    tabsContainer.appendChild(tab);
  }

  selectPresetPack(savedPack, false);
}

function selectPresetPack(packId, save = true) {
  const pack = PRESET_PACKS[packId];
  if (!pack) return;

  // Update tabs
  $$('.preset-tab').forEach(t => t.classList.toggle('active', t.dataset.pack === packId));

  // Update presets row
  const presetsRow = $('#presets-row');
  if (!presetsRow) return;
  
  presetsRow.innerHTML = '';
  for (const [key, text] of Object.entries(pack.presets)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost preset-btn';
    if (key === 'SOS' || key === 'MAYDAY') btn.classList.add('btn-sos');
    btn.textContent = key;
    btn.title = text;
    btn.addEventListener('click', () => handlePreset(key, packId));
    presetsRow.appendChild(btn);
  }

  if (save) {
    localStorage.setItem(STORAGE_KEYS.presetPack, packId);
  }
}

// ============== HISTORY ==============

function addToHistory(text) {
  if (!text) return;
  try {
    let hist = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
    hist = hist.filter(h => h !== text);
    hist.unshift(text);
    hist = hist.slice(0, HISTORY_MAX);
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(hist));
  } catch (_) {}
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
  } catch (_) {
    return [];
  }
}

function initHistory() {
  const btn = $('#history-btn');
  const dropdown = $('#history-dropdown');
  if (!btn || !dropdown) return;

  function refreshDropdown() {
    const hist = getHistory();
    dropdown.innerHTML = '';
    if (hist.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-item';
      empty.textContent = 'No history yet';
      empty.style.color = 'var(--text-muted)';
      dropdown.appendChild(empty);
    } else {
      hist.forEach((t, i) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.textContent = t.length > 50 ? t.slice(0, 47) + '...' : t;
        item.addEventListener('click', () => {
          const input = $('#text-input');
          if (input) {
            input.value = hist[i];
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          dropdown.hidden = true;
        });
        dropdown.appendChild(item);
      });
    }
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    refreshDropdown();
    dropdown.hidden = !dropdown.hidden;
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== btn) {
      dropdown.hidden = true;
    }
  });
}

// ============== REFERENCE TAB ==============

function initReferenceTab() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const numbers = '0123456789'.split('');
  const punctuation = ['.', ',', '?', "'", '!', '/', '(', ')', '&', ':', ';', '=', '+', '-', '"', '$', '@'];

  const renderGrid = (containerId, chars) => {
    const el = $(`#${containerId}`);
    if (!el) return;
    el.innerHTML = '';
    for (const c of chars) {
      const code = MORSE_MAP[c];
      if (!code) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ref-char';
      btn.dataset.char = c.toLowerCase();
      btn.innerHTML = `<span class="char">${c}</span><span class="code">${code.replace(/\./g, '·').replace(/-/g, '−')}</span>`;
      btn.addEventListener('click', () => insertRefChar(c));
      el.appendChild(btn);
    }
  };

  renderGrid('ref-letters', letters);
  renderGrid('ref-numbers', numbers);
  renderGrid('ref-punctuation', punctuation);

  // Search functionality
  const searchInput = $('#ref-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      $$('.ref-char').forEach(btn => {
        const char = btn.dataset.char;
        btn.style.display = !query || char.includes(query) ? '' : 'none';
      });
    });
  }
}

function insertRefChar(char) {
  const input = $('#text-input');
  if (input) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const val = input.value;
    input.value = val.slice(0, start) + char + val.slice(end);
    input.selectionStart = input.selectionEnd = start + char.length;
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Switch to encode tab
    switchTab('encode');
  }
}

// ============== PRACTICE MODE ==============

function initPractice() {
  const startBtn = $('#start-practice-btn');
  const submitBtn = $('#submit-answer-btn');
  const skipBtn = $('#skip-btn');
  const endBtn = $('#end-practice-btn');
  const replayBtn = $('#practice-replay-btn');
  const againBtn = $('#practice-again-btn');
  const viewStatsBtn = $('#view-stats-btn');
  const practiceInput = $('#practice-input');
  const practiceWpm = $('#practice-wpm');

  // Update WPM display
  practiceWpm?.addEventListener('input', () => {
    $('#practice-wpm-value').textContent = practiceWpm.value;
  });

  startBtn?.addEventListener('click', startPractice);
  submitBtn?.addEventListener('click', submitPracticeAnswer);
  skipBtn?.addEventListener('click', skipPracticeItem);
  endBtn?.addEventListener('click', endPractice);
  replayBtn?.addEventListener('click', replayPracticeAudio);
  againBtn?.addEventListener('click', () => showPracticeSetup());
  viewStatsBtn?.addEventListener('click', openStatsModal);

  practiceInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitPracticeAnswer();
    }
  });

  // Load weak characters
  updateWeakCharsDisplay();
}

function updateWeakCharsDisplay() {
  const stats = loadStats();
  const weak = getWeakCharacters(stats);
  const section = $('#weak-chars-section');
  const list = $('#weak-chars-list');
  
  if (section && list) {
    if (weak.length > 0) {
      section.hidden = false;
      list.innerHTML = weak.map(w => 
        `<span class="weak-char" title="${w.accuracy}% accuracy">${w.char}</span>`
      ).join('');
    } else {
      section.hidden = true;
    }
  }
}

function showPracticeSetup() {
  $('#practice-setup').hidden = false;
  $('#practice-session').hidden = true;
  $('#practice-results').hidden = true;
  updateWeakCharsDisplay();
}

function showPracticeSession() {
  $('#practice-setup').hidden = true;
  $('#practice-session').hidden = false;
  $('#practice-results').hidden = true;
  $('#practice-input').value = '';
  $('#practice-input').focus();
}

function showPracticeResults(stats) {
  $('#practice-setup').hidden = true;
  $('#practice-session').hidden = true;
  $('#practice-results').hidden = false;
  
  $('#result-correct').textContent = stats.correct;
  $('#result-total').textContent = stats.total;
  $('#result-accuracy').textContent = `${stats.accuracy}%`;
  $('#result-streak').textContent = stats.bestStreak;
}

async function startPractice() {
  const difficulty = $('#practice-difficulty')?.value || 'intermediate';
  const drillType = $('#practice-drill-type')?.value || 'characters';
  const wpm = parseInt($('#practice-wpm')?.value || 12, 10);
  const audioOpts = getState();

  currentSession = new PracticeSession({
    difficulty,
    drillType,
    wpm,
    frequency: audioOpts.frequency,
    volume: audioOpts.volume,
    farnsworthWpm: audioOpts.farnsworthWpm,
    onUpdate: handlePracticeUpdate,
    onComplete: handlePracticeComplete
  });

  showPracticeSession();
  await currentSession.start();
}

function handlePracticeUpdate(data) {
  if (data.type === 'newRound') {
    const promptChar = $('#prompt-char');
    const promptMorse = $('#prompt-morse');
    const input = $('#practice-input');
    
    if (data.isListenMode) {
      promptChar.textContent = '?';
      promptMorse.textContent = 'Listen and type what you hear';
    } else {
      promptChar.textContent = data.item;
      promptMorse.textContent = data.morse;
    }
    
    if (input) {
      input.value = '';
      input.focus();
    }
    
    $('#practice-feedback').hidden = true;
  }
  
  if (data.type === 'answer') {
    const feedback = $('#practice-feedback');
    const icon = feedback?.querySelector('.feedback-icon');
    const text = feedback?.querySelector('.feedback-text');
    
    if (feedback) {
      feedback.hidden = false;
      feedback.className = `practice-feedback ${data.correct ? 'correct' : 'wrong'}`;
      if (icon) icon.textContent = data.correct ? '✓' : '✗';
      if (text) text.textContent = data.correct ? 'Correct!' : `Wrong - it was "${data.expected}"`;
    }
  }
  
  if (data.stats) {
    $('#practice-correct').textContent = data.stats.correct;
    $('#practice-wrong').textContent = data.stats.wrong;
    $('#practice-streak').textContent = data.stats.streak;
    $('#practice-accuracy').textContent = `${data.stats.accuracy}%`;
  }
}

function handlePracticeComplete(stats) {
  recordSession({
    ...stats,
    attempts: currentSession?.attempts || []
  });
  showPracticeResults(stats);
  updateStreakBadge();
}

async function submitPracticeAnswer() {
  if (!currentSession?.isActive) return;
  
  const input = $('#practice-input');
  const answer = input?.value?.trim() || '';
  
  if (!answer) return;
  
  const correct = currentSession.checkAnswer(answer);
  
  // Brief delay before next round
  setTimeout(async () => {
    if (currentSession?.isActive) {
      await currentSession.nextRound();
    }
  }, correct ? 500 : 1500);
}

async function skipPracticeItem() {
  if (!currentSession?.isActive) return;
  currentSession.checkAnswer('');
  setTimeout(async () => {
    if (currentSession?.isActive) {
      await currentSession.nextRound();
    }
  }, 1000);
}

async function replayPracticeAudio() {
  if (currentSession?.isActive) {
    await currentSession.playCurrentItem();
  }
}

function endPractice() {
  if (currentSession) {
    const stats = currentSession.stop();
    currentSession = null;
    showPracticeResults(stats);
  }
}

// ============== STATS ==============

function updateStreakBadge() {
  const stats = loadStats();
  const badge = $('#streak-badge');
  if (badge) {
    if (stats.currentStreak > 0) {
      badge.textContent = stats.currentStreak;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }
}

function openStatsModal() {
  const modal = $('#stats-modal');
  if (!modal) return;
  
  const stats = loadStats();
  const summary = getProgressSummary(stats);
  const achievements = getAchievementsList();
  
  $('#stat-sessions').textContent = summary.totalSessions;
  $('#stat-time').textContent = formatTime(summary.totalTime);
  $('#stat-accuracy').textContent = `${summary.overallAccuracy}%`;
  $('#stat-streak').textContent = summary.currentDailyStreak;
  
  // Weak characters
  const weakCharsEl = $('#stats-weak-chars');
  if (weakCharsEl) {
    if (summary.weakCharacters.length > 0) {
      weakCharsEl.innerHTML = summary.weakCharacters.map(w => 
        `<div class="char-stat">
          <span class="char-stat-char">${w.char}</span>
          <span class="char-stat-accuracy">${w.accuracy}%</span>
        </div>`
      ).join('');
    } else {
      weakCharsEl.innerHTML = '<p class="text-muted">Complete some practice sessions to see which characters need work.</p>';
    }
  }
  
  // Achievements
  const achievementsGrid = $('#achievements-grid');
  if (achievementsGrid) {
    achievementsGrid.innerHTML = achievements.map(a => {
      const unlocked = stats.achievements.includes(a.id);
      return `<div class="achievement ${unlocked ? 'unlocked' : 'locked'}">
        <span class="achievement-icon">${a.icon}</span>
        <span class="achievement-name">${a.name}</span>
        <span class="achievement-desc">${a.desc}</span>
      </div>`;
    }).join('');
  }
  
  modal.hidden = false;
}

function initStatsModal() {
  $('#stats-header-btn')?.addEventListener('click', openStatsModal);
  $('#stats-modal-close')?.addEventListener('click', () => {
    $('#stats-modal').hidden = true;
  });
  $('#stats-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'stats-modal') {
      $('#stats-modal').hidden = true;
    }
  });
  $('#reset-stats-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all your progress? This cannot be undone.')) {
      resetStats();
      showToast('Progress reset', 'info');
      $('#stats-modal').hidden = true;
      updateStreakBadge();
    }
  });
}

// ============== MODALS ==============

function initHelpModal() {
  $('#help-btn')?.addEventListener('click', () => {
    $('#help-modal').hidden = false;
  });
  $('#modal-close')?.addEventListener('click', () => {
    $('#help-modal').hidden = true;
  });
  $('#help-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'help-modal') {
      $('#help-modal').hidden = true;
    }
  });
}

function initQRModal() {
  $('#qr-btn')?.addEventListener('click', handleQRCode);
  $('#qr-modal-close')?.addEventListener('click', () => {
    $('#qr-modal').hidden = true;
  });
  $('#qr-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'qr-modal') {
      $('#qr-modal').hidden = true;
    }
  });
  $('#download-qr-btn')?.addEventListener('click', () => {
    const text = $('#text-input')?.value?.trim() || '';
    if (text) {
      downloadQRCode(text);
      showToast('QR code downloaded', 'success');
    }
  });
  $('#copy-link-btn')?.addEventListener('click', async () => {
    const text = $('#text-input')?.value?.trim() || '';
    if (text) {
      const url = createShareableUrl(text);
      await navigator.clipboard.writeText(url);
      showToast('Link copied!', 'success');
    }
  });
}

// ============== THEME & PERSISTENCE ==============

function handleThemeToggle() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(STORAGE_KEYS.theme, next);
  } catch (_) {}
}

function loadPersisted() {
  try {
    const theme = localStorage.getItem(STORAGE_KEYS.theme);
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    
    const wpm = localStorage.getItem(STORAGE_KEYS.wpm);
    if (wpm) {
      const v = parseInt(wpm, 10);
      if (v >= 5 && v <= 35) {
        const slider = $('#wpm-slider');
        if (slider) slider.value = v;
      }
    }
    
    const freq = localStorage.getItem(STORAGE_KEYS.freq);
    if (freq) {
      const v = parseInt(freq, 10);
      if (v >= 400 && v <= 1000) {
        const slider = $('#freq-slider');
        if (slider) slider.value = v;
      }
    }
    
    const fw = localStorage.getItem(STORAGE_KEYS.farnsworth);
    const cb = $('#farnsworth');
    if (cb) cb.checked = fw === 'true';
    
    const vol = localStorage.getItem(STORAGE_KEYS.volume);
    if (vol) {
      const v = parseInt(vol, 10);
      if (v >= 0 && v <= 100) {
        const slider = $('#vol-slider');
        if (slider) slider.value = v;
      }
    }
    
    const fmt = localStorage.getItem(STORAGE_KEYS.exportFormat);
    if (fmt === 'wav') {
      const radio = $('#export-wav');
      if (radio) radio.checked = true;
    }
    
    const profile = localStorage.getItem(STORAGE_KEYS.audioProfile);
    if (profile) {
      const select = $('#audio-profile');
      if (select) select.value = profile;
    }
    
    const loop = localStorage.getItem(STORAGE_KEYS.loopPlayback);
    const loopCb = $('#loop-playback');
    if (loopCb) loopCb.checked = loop === 'true';
  } catch (_) {}
}

function persistOptions() {
  try {
    const opts = getState();
    localStorage.setItem(STORAGE_KEYS.wpm, String(opts.wpm));
    localStorage.setItem(STORAGE_KEYS.freq, String(opts.frequency));
    localStorage.setItem(STORAGE_KEYS.farnsworth, String(!!opts.farnsworthWpm));
    localStorage.setItem(STORAGE_KEYS.volume, String(Math.round((opts.volume || 1) * 100)));
    localStorage.setItem(STORAGE_KEYS.audioProfile, $('#audio-profile')?.value || 'cw');
    localStorage.setItem(STORAGE_KEYS.loopPlayback, String(opts.loop));
    const fmt = $('#export-mp3')?.checked ? 'mp3' : 'wav';
    localStorage.setItem(STORAGE_KEYS.exportFormat, fmt);
  } catch (_) {}
}

// ============== TABS ==============

function switchTab(tabId) {
  $$('.tab').forEach(t => {
    const isActive = t.dataset.tab === tabId;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive);
    t.setAttribute('tabindex', isActive ? '0' : '-1');
  });
  $$('.panel').forEach(p => {
    const isActive = p.id === `panel-${tabId}`;
    p.classList.toggle('active', isActive);
    p.hidden = !isActive;
  });
  
  // Focus practice input when switching to practice tab
  if (tabId === 'practice' && !$('#practice-session').hidden) {
    $('#practice-input')?.focus();
  }
}

function initTabs() {
  const tabs = Array.from($$('.tab'));
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    
    tab.addEventListener('keydown', (e) => {
      const currentIndex = tabs.indexOf(tab);
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          newIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      tabs[newIndex].focus();
      switchTab(tabs[newIndex].dataset.tab);
    });
  });
}

// ============== PWA INSTALL ==============

function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    $('#install-prompt').hidden = false;
  });

  $('#install-btn')?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('App installed!', 'success');
      }
      deferredInstallPrompt = null;
      $('#install-prompt').hidden = true;
    }
  });

  $('#dismiss-install-btn')?.addEventListener('click', () => {
    $('#install-prompt').hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    $('#install-prompt').hidden = true;
  });
}

// ============== INITIALIZATION ==============

function init() {
  loadPersisted();

  // Check for shared URL
  const shared = parseShareableUrl();
  if (shared) {
    const input = $('#text-input');
    if (input) input.value = shared;
  }

  // Main input handlers
  $('#text-input')?.addEventListener('input', () => {
    const val = $('#text-input').value;
    if (val.length > CHAR_LIMIT) {
      $('#text-input').value = val.slice(0, CHAR_LIMIT);
    }
    cachedBuffer = null;
    updateUI();
  });

  $('#morse-input')?.addEventListener('input', updateDecodePanel);

  // Slider handlers
  $('#wpm-slider')?.addEventListener('input', () => {
    cachedBuffer = null;
    updateUI();
    persistOptions();
  });
  $('#freq-slider')?.addEventListener('input', () => {
    cachedBuffer = null;
    updateUI();
    persistOptions();
  });
  $('#vol-slider')?.addEventListener('input', () => {
    updateUI();
    persistOptions();
  });
  $('#farnsworth')?.addEventListener('change', () => {
    cachedBuffer = null;
    persistOptions();
  });
  $('#audio-profile')?.addEventListener('change', () => {
    cachedBuffer = null;
    persistOptions();
  });
  $('#loop-playback')?.addEventListener('change', persistOptions);

  // Button handlers
  $('#play-btn')?.addEventListener('click', handlePlay);
  $('#download-btn')?.addEventListener('click', handleDownload);
  $('#share-btn')?.addEventListener('click', handleShare);
  $('#copy-morse-btn')?.addEventListener('click', handleCopyMorse);
  $('#waveform-export-btn')?.addEventListener('click', handleWaveformExport);
  $('.theme-toggle')?.addEventListener('click', handleThemeToggle);

  // Decode panel
  $('#copy-decoded-btn')?.addEventListener('click', handleCopyDecoded);
  $('#play-decoded-btn')?.addEventListener('click', handlePlayDecoded);

  // Export format
  $('#export-mp3')?.addEventListener('change', persistOptions);
  $('#export-wav')?.addEventListener('change', persistOptions);

  // Initialize all modules
  initPresets();
  initReferenceTab();
  initHelpModal();
  initHistory();
  initTabs();
  initPractice();
  initStatsModal();
  initQRModal();
  initPWA();
  updateStreakBadge();

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close modals
      if ($('#help-modal') && !$('#help-modal').hidden) {
        $('#help-modal').hidden = true;
      } else if ($('#stats-modal') && !$('#stats-modal').hidden) {
        $('#stats-modal').hidden = true;
      } else if ($('#qr-modal') && !$('#qr-modal').hidden) {
        $('#qr-modal').hidden = true;
      } else if ($('#history-dropdown') && !$('#history-dropdown').hidden) {
        $('#history-dropdown').hidden = true;
      } else if (currentPlayback) {
        stopPlayback(currentPlayback);
        currentPlayback = null;
        const icon = $('#play-btn')?.querySelector('.btn-icon');
        const textEl = $('#play-btn')?.querySelector('.btn-text');
        if (icon) icon.textContent = '▶';
        if (textEl) textEl.textContent = 'Play';
      }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if ($('#panel-encode')?.classList.contains('active')) {
        handlePlay();
      }
    }
  });

  updateUI();
  updateDecodePanel();
}

init();

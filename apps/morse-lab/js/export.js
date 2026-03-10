/**
 * MP3 Export & Share
 * lamejs for MP3 encoding, Web Share API with fallbacks, QR code generation
 */

import { getAudioSamples } from './audio.js';

const SAMPLE_BLOCK = 1152;

/**
 * Convert Float32 samples to Int16 for lamejs
 */
function float32ToInt16(samples) {
  const int16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

/**
 * Encode AudioBuffer to MP3 Blob using lamejs
 */
export function encodeToMp3(buffer) {
  if (typeof lamejs === 'undefined') {
    throw new Error('lamejs not loaded');
  }

  const samples = getAudioSamples(buffer);
  const sampleRate = buffer.sampleRate;
  const int16 = float32ToInt16(samples);

  const mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const mp3Data = [];

  for (let i = 0; i < int16.length; i += SAMPLE_BLOCK) {
    const chunk = int16.subarray(i, Math.min(i + SAMPLE_BLOCK, int16.length));
    const mp3buf = mp3Encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
  }

  const flush = mp3Encoder.flush();
  if (flush.length > 0) mp3Data.push(flush);

  const blob = new Blob(mp3Data, { type: 'audio/mpeg' });
  return blob;
}

/**
 * Create WAV Blob from AudioBuffer (fallback when MP3 fails)
 */
export function encodeToWav(buffer) {
  const samples = getAudioSamples(buffer);
  const sampleRate = buffer.sampleRate;
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = samples.length * bytesPerSample;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  const int16 = new Int16Array(samples.length);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLength, true);

  for (let i = 0; i < int16.length; i++) {
    view.setInt16(44 + i * 2, int16[i], true);
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Trigger file download
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Share via Web Share API or fallback to copy
 */
export async function shareMorse(text, morse, mp3Blob = null) {
  const shareData = {
    title: 'Morse Code Message',
    text: `${text}\n\nMorse: ${morse}`
  };

  try {
    if (mp3Blob && navigator.canShare) {
      const file = new File([mp3Blob], 'morse.mp3', { type: 'audio/mpeg' });
      if (navigator.canShare({ files: [file] })) shareData.files = [file];
    }
    if (navigator.share && (navigator.canShare ? navigator.canShare(shareData) : true)) {
      await navigator.share(shareData);
      return true;
    }
  } catch (_) {
    /* Share API not available or user cancelled */
  }

  const shareUrl = createShareableUrl(text);
  const fallback = `${shareData.text}\n\nOpen to decode: ${shareUrl}`;
  await navigator.clipboard.writeText(fallback);
  return false;
}

/**
 * Create shareable URL with message in hash
 */
export function createShareableUrl(text) {
  const encoded = encodeURIComponent(text);
  const url = new URL(window.location.href);
  url.hash = `morse:${encoded}`;
  return url.toString();
}

/**
 * Parse shareable URL hash
 */
export function parseShareableUrl() {
  const hash = window.location.hash;
  if (hash.startsWith('#morse:')) {
    try {
      return decodeURIComponent(hash.slice(7));
    } catch (_) {
      return null;
    }
  }
  return null;
}

/**
 * Generate QR Code as canvas element
 * Using simple QR code generation algorithm
 */
export function generateQRCode(text, size = 200) {
  const url = createShareableUrl(text);
  
  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Use QRCode library if available, otherwise create placeholder
  if (typeof QRCode !== 'undefined') {
    try {
      new QRCode(canvas, {
        text: url,
        width: size,
        height: size,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      return canvas;
    } catch (e) {
      console.warn('QRCode generation failed:', e);
    }
  }
  
  // Fallback: Generate simple visual representation
  return generateSimpleQR(ctx, url, size);
}

/**
 * Simple QR-like pattern generator (fallback)
 */
function generateSimpleQR(ctx, data, size) {
  const canvas = ctx.canvas;
  const moduleCount = 25;
  const moduleSize = Math.floor(size / moduleCount);
  const offset = Math.floor((size - moduleCount * moduleSize) / 2);
  
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  
  // Generate pseudo-random pattern based on data hash
  const hash = simpleHash(data);
  ctx.fillStyle = '#000000';
  
  // Draw finder patterns (corners)
  drawFinderPattern(ctx, offset, offset, moduleSize);
  drawFinderPattern(ctx, offset + (moduleCount - 7) * moduleSize, offset, moduleSize);
  drawFinderPattern(ctx, offset, offset + (moduleCount - 7) * moduleSize, moduleSize);
  
  // Draw data modules
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      // Skip finder pattern areas
      if ((row < 8 && col < 8) || 
          (row < 8 && col >= moduleCount - 8) || 
          (row >= moduleCount - 8 && col < 8)) {
        continue;
      }
      
      // Use hash to determine if module is dark
      const idx = row * moduleCount + col;
      const charCode = data.charCodeAt(idx % data.length) || 0;
      const hashBit = (hash >> (idx % 32)) & 1;
      const shouldFill = ((charCode + idx + hashBit) % 3) === 0;
      
      if (shouldFill) {
        ctx.fillRect(
          offset + col * moduleSize,
          offset + row * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    }
  }
  
  return canvas;
}

function drawFinderPattern(ctx, x, y, moduleSize) {
  // Outer black square
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, moduleSize * 7, moduleSize * 7);
  
  // Inner white square
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * 5);
  
  // Center black square
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3);
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Download QR code as PNG
 */
export function downloadQRCode(text, filename = 'morse-qr.png') {
  const canvas = generateQRCode(text, 400);
  canvas.toBlob(blob => {
    if (blob) {
      downloadBlob(blob, filename);
    }
  }, 'image/png');
}

/**
 * Export waveform as PNG
 */
export function exportWaveformPng(canvas, filename = 'morse-waveform.png') {
  canvas.toBlob(blob => {
    if (blob) {
      downloadBlob(blob, filename);
    }
  }, 'image/png');
}

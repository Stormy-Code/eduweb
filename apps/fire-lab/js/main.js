/**
 * @fileoverview Main entry point for Fire Lab.
 * Bootstraps the application and runs the simulation loop.
 */

import { state, celsiusToKelvin } from './state.js';
import { step } from './physics.js';
import { initRenderer, render } from './renderer.js';
import { initUI, updateMetrics } from './ui.js';
import { initWeather } from './weather.js';

const PHYSICS_STEP = 1 / 60;
const MAX_FRAME_TIME = 0.1;

let lastTime = 0;
let accumulator = 0;

/**
 * Main application initialization.
 */
async function init() {
  const container = document.getElementById('canvasWrapper');

  if (!container) {
    console.error('Canvas wrapper element not found');
    return;
  }

  state.wallTemperature = celsiusToKelvin(state.ambientTemp);

  initRenderer(container);
  initUI();

  initWeather().catch((err) => {
    console.warn('Weather initialization failed:', err);
  });

  requestAnimationFrame(loop);
}

/**
 * Main simulation loop using fixed timestep with accumulator.
 * @param {DOMHighResTimeStamp} timestamp
 */
function loop(timestamp) {
  const currentTime = timestamp / 1000;

  if (lastTime === 0) {
    lastTime = currentTime;
  }

  let frameTime = currentTime - lastTime;
  lastTime = currentTime;

  if (frameTime > MAX_FRAME_TIME) {
    frameTime = MAX_FRAME_TIME;
  }

  accumulator += frameTime;

  while (accumulator >= PHYSICS_STEP) {
    step(PHYSICS_STEP);
    accumulator -= PHYSICS_STEP;
  }

  render();
  updateMetrics();

  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

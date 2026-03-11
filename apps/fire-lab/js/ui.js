/**
 * @fileoverview UI controller for Fire Lab.
 * Handles control bindings, metrics display updates, and user interactions.
 */

import { state, resetState, MATERIALS, kelvinToCelsius } from './state.js';
import { getMetrics } from './physics.js';
import { fetchWeatherFromState, requestGeolocation, onWeatherStatus } from './weather.js';

/** @type {Object.<string, HTMLElement>} */
const elements = {};

/**
 * Initializes UI bindings and event listeners.
 */
export function initUI() {
  cacheElements();
  bindControls();
  bindButtons();
  setupWeatherStatusDisplay();
  updateAllOutputs();
}

function cacheElements() {
  const ids = [
    'firePower', 'firePowerValue',
    'fireActive',
    'wallMaterial', 'wallThickness', 'wallThicknessValue',
    'ambientTemp', 'ambientTempValue',
    'windSpeed', 'windSpeedValue',
    'humidity', 'humidityValue',
    'timeScale', 'timeScaleValue',
    'showHeatmap',
    'latitude', 'longitude',
    'btnReset', 'btnExtinguish', 'btnFetchWeather', 'btnUseGeolocation',
    'metricFireTemp', 'metricWallTemp', 'metricPersonHeat',
    'metricRadiative', 'metricConvective', 'metricWallEnergy',
    'metricViewFactors', 'metricSimTime',
    'weatherText'
  ];

  for (const id of ids) {
    elements[id] = document.getElementById(id);
  }
}

function bindControls() {
  bindRange('firePower', 'firePowerValue', (v) => {
    state.firePower = v;
    return `${v} kW`;
  });

  bindCheckbox('fireActive', (v) => {
    state.fireActive = v;
  });

  bindSelect('wallMaterial', (v) => {
    state.wallMaterial = v;
    state.wallTemperature = state.ambientTemp + 273.15;
    state.wallStoredEnergy = 0;
  });

  bindRange('wallThickness', 'wallThicknessValue', (v) => {
    state.wallThickness = v;
    return `${v.toFixed(2)} m`;
  });

  bindRange('ambientTemp', 'ambientTempValue', (v) => {
    state.ambientTemp = v;
    return `${v} °C`;
  });

  bindRange('windSpeed', 'windSpeedValue', (v) => {
    state.windSpeed = v;
    return `${v} m/s`;
  });

  bindRange('humidity', 'humidityValue', (v) => {
    state.humidity = v;
    return `${v}%`;
  });

  bindRange('timeScale', 'timeScaleValue', (v) => {
    state.timeScale = v;
    return `${v}x`;
  });

  bindCheckbox('showHeatmap', (v) => {
    state.showHeatmap = v;
  });

  bindNumber('latitude', (v) => {
    state.location.latitude = v;
  });

  bindNumber('longitude', (v) => {
    state.location.longitude = v;
  });
}

function bindRange(inputId, outputId, handler) {
  const input = elements[inputId];
  const output = elements[outputId];

  if (!input || !output) return;

  const update = () => {
    const value = parseFloat(input.value);
    const displayValue = handler(value);
    output.textContent = displayValue;
  };

  input.addEventListener('input', update);
  update();
}

function bindCheckbox(inputId, handler) {
  const input = elements[inputId];
  if (!input) return;

  input.addEventListener('change', () => {
    handler(input.checked);
  });
}

function bindSelect(inputId, handler) {
  const input = elements[inputId];
  if (!input) return;

  input.addEventListener('change', () => {
    handler(input.value);
  });
}

function bindNumber(inputId, handler) {
  const input = elements[inputId];
  if (!input) return;

  input.addEventListener('change', () => {
    const value = parseFloat(input.value);
    if (!isNaN(value)) {
      handler(value);
    }
  });
}

function bindButtons() {
  elements.btnReset?.addEventListener('click', handleReset);
  elements.btnExtinguish?.addEventListener('click', handleExtinguish);
  elements.btnFetchWeather?.addEventListener('click', handleFetchWeather);
  elements.btnUseGeolocation?.addEventListener('click', handleUseGeolocation);
}

function handleReset() {
  resetState();
  syncControlsToState();
  updateAllOutputs();
}

function handleExtinguish() {
  state.fireActive = false;
  if (elements.fireActive) {
    elements.fireActive.checked = false;
  }
}

async function handleFetchWeather() {
  try {
    await fetchWeatherFromState();
    syncControlsToState();
  } catch (error) {
    console.error('Weather fetch error:', error);
  }
}

async function handleUseGeolocation() {
  try {
    await requestGeolocation();
    syncControlsToState();
    await fetchWeatherFromState();
    syncControlsToState();
  } catch (error) {
    console.error('Geolocation error:', error);
  }
}

function setupWeatherStatusDisplay() {
  onWeatherStatus((message, success) => {
    if (elements.weatherText) {
      elements.weatherText.textContent = message;
      elements.weatherText.style.color = success ? '' : 'var(--color-warning)';
    }
  });
}

function syncControlsToState() {
  if (elements.firePower) {
    elements.firePower.value = state.firePower;
    elements.firePowerValue.textContent = `${state.firePower} kW`;
  }

  if (elements.fireActive) {
    elements.fireActive.checked = state.fireActive;
  }

  if (elements.wallMaterial) {
    elements.wallMaterial.value = state.wallMaterial;
  }

  if (elements.wallThickness) {
    elements.wallThickness.value = state.wallThickness;
    elements.wallThicknessValue.textContent = `${state.wallThickness.toFixed(2)} m`;
  }

  if (elements.ambientTemp) {
    elements.ambientTemp.value = state.ambientTemp;
    elements.ambientTempValue.textContent = `${state.ambientTemp} °C`;
  }

  if (elements.windSpeed) {
    elements.windSpeed.value = state.windSpeed;
    elements.windSpeedValue.textContent = `${state.windSpeed} m/s`;
  }

  if (elements.humidity) {
    elements.humidity.value = state.humidity;
    elements.humidityValue.textContent = `${state.humidity}%`;
  }

  if (elements.latitude) {
    elements.latitude.value = state.location.latitude.toFixed(2);
  }

  if (elements.longitude) {
    elements.longitude.value = state.location.longitude.toFixed(2);
  }

  if (elements.timeScale) {
    elements.timeScale.value = state.timeScale;
    elements.timeScaleValue.textContent = `${state.timeScale}x`;
  }

  if (elements.showHeatmap) {
    elements.showHeatmap.checked = state.showHeatmap;
  }
}

function updateAllOutputs() {
  if (elements.firePowerValue) {
    elements.firePowerValue.textContent = `${state.firePower} kW`;
  }
  if (elements.wallThicknessValue) {
    elements.wallThicknessValue.textContent = `${state.wallThickness.toFixed(2)} m`;
  }
  if (elements.ambientTempValue) {
    elements.ambientTempValue.textContent = `${state.ambientTemp} °C`;
  }
  if (elements.windSpeedValue) {
    elements.windSpeedValue.textContent = `${state.windSpeed} m/s`;
  }
  if (elements.humidityValue) {
    elements.humidityValue.textContent = `${state.humidity}%`;
  }
  if (elements.timeScaleValue) {
    elements.timeScaleValue.textContent = `${state.timeScale}x`;
  }
}

/**
 * Updates the metrics display panel with current physics data.
 */
export function updateMetrics() {
  const metrics = getMetrics();

  if (elements.metricFireTemp) {
    const tempC = kelvinToCelsius(metrics.fireTemp);
    elements.metricFireTemp.textContent = state.fireActive
      ? `${tempC.toFixed(0)} °C`
      : 'Off';
  }

  if (elements.metricWallTemp) {
    const tempC = kelvinToCelsius(metrics.wallTemp);
    elements.metricWallTemp.textContent = `${tempC.toFixed(1)} °C`;
  }

  if (elements.metricPersonHeat) {
    const watts = metrics.personHeatGain;
    if (watts >= 0) {
      elements.metricPersonHeat.textContent = `+${watts.toFixed(0)} W`;
      elements.metricPersonHeat.style.color = 'var(--color-accent)';
    } else {
      elements.metricPersonHeat.textContent = `${watts.toFixed(0)} W`;
      elements.metricPersonHeat.style.color = 'var(--color-cool)';
    }
  }

  if (elements.metricRadiative) {
    elements.metricRadiative.textContent = `${metrics.radiativeFlux.toFixed(0)} W`;
  }

  if (elements.metricConvective) {
    elements.metricConvective.textContent = `${metrics.convectiveLoss.toFixed(0)} W`;
  }

  if (elements.metricWallEnergy) {
    const kJ = metrics.wallStoredEnergy / 1000;
    elements.metricWallEnergy.textContent = `${kJ.toFixed(1)} kJ`;
  }

  if (elements.metricViewFactors) {
    const vf = metrics.viewFactors;
    elements.metricViewFactors.textContent =
      `F_fp: ${vf.fireToPerson.toFixed(3)} | F_fw: ${vf.fireToWall.toFixed(3)} | F_wp: ${vf.wallToPerson.toFixed(3)}`;
  }

  if (elements.metricSimTime) {
    const totalSec = Math.floor(metrics.simTime);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    elements.metricSimTime.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
  }
}

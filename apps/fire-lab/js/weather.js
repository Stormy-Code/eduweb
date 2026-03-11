/**
 * @fileoverview Weather service for Fire Lab.
 * Fetches live weather data from Open-Meteo API with geolocation support.
 */

import { state } from './state.js';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * @typedef {Object} WeatherData
 * @property {number} temperature - Temperature in Celsius
 * @property {number} windSpeed - Wind speed in m/s
 * @property {number} humidity - Relative humidity %
 * @property {string} description - Weather description
 */

/**
 * Weather status callback type.
 * @callback WeatherStatusCallback
 * @param {string} status - Status message
 * @param {boolean} success - Whether the operation succeeded
 */

/** @type {WeatherStatusCallback|null} */
let statusCallback = null;

/**
 * Registers a callback for weather status updates.
 * @param {WeatherStatusCallback} callback
 */
export function onWeatherStatus(callback) {
  statusCallback = callback;
}

function notifyStatus(message, success = true) {
  if (statusCallback) {
    statusCallback(message, success);
  }
}

/**
 * Requests browser geolocation.
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export function requestGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    notifyStatus('Requesting location...', true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        state.location.latitude = latitude;
        state.location.longitude = longitude;
        notifyStatus(`Location: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`, true);
        resolve({ latitude, longitude });
      },
      (error) => {
        let message = 'Location denied';
        if (error.code === error.TIMEOUT) {
          message = 'Location timeout';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location unavailable';
        }
        notifyStatus(message, false);
        reject(new Error(message));
      },
      {
        timeout: 10000,
        maximumAge: 300000
      }
    );
  });
}

/**
 * Fetches current weather from Open-Meteo API.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<WeatherData>}
 */
export async function fetchWeather(latitude, longitude) {
  notifyStatus('Fetching weather...', true);

  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    wind_speed_unit: 'ms',
    timezone: 'auto'
  });

  try {
    const response = await fetch(`${OPEN_METEO_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.current) {
      throw new Error('Invalid API response');
    }

    const current = data.current;
    const weatherData = {
      temperature: current.temperature_2m,
      windSpeed: current.wind_speed_10m,
      humidity: current.relative_humidity_2m,
      description: getWeatherDescription(current.weather_code)
    };

    applyWeatherToState(weatherData);

    notifyStatus(`${weatherData.temperature.toFixed(1)}°C, ${weatherData.description}`, true);

    return weatherData;
  } catch (error) {
    notifyStatus('Weather fetch failed', false);
    throw error;
  }
}

/**
 * Applies fetched weather data to simulation state.
 * @param {WeatherData} weather
 */
function applyWeatherToState(weather) {
  state.ambientTemp = weather.temperature;
  state.windSpeed = weather.windSpeed;
  state.humidity = weather.humidity;

  state.weather.fetched = true;
  state.weather.temperature = weather.temperature;
  state.weather.windSpeed = weather.windSpeed;
  state.weather.humidity = weather.humidity;
  state.weather.description = weather.description;
}

/**
 * Converts WMO weather code to description.
 * @param {number} code - WMO weather code
 * @returns {string}
 */
function getWeatherDescription(code) {
  const codes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail'
  };

  return codes[code] || 'Unknown';
}

/**
 * Fetches weather using current state location.
 * @returns {Promise<WeatherData>}
 */
export async function fetchWeatherFromState() {
  return fetchWeather(state.location.latitude, state.location.longitude);
}

/**
 * Attempts to get geolocation and fetch weather automatically.
 * Falls back to default location if geolocation fails.
 * @returns {Promise<WeatherData|null>}
 */
export async function initWeather() {
  try {
    await requestGeolocation();
    return await fetchWeatherFromState();
  } catch (geoError) {
    console.warn('Geolocation failed, using default location:', geoError.message);
    try {
      return await fetchWeatherFromState();
    } catch (weatherError) {
      console.warn('Weather fetch failed:', weatherError.message);
      notifyStatus('Using manual settings', false);
      return null;
    }
  }
}

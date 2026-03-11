/**
 * @fileoverview Shared simulation state and configuration for Fire Lab.
 * Provides centralized state management, material properties, and unit conversion helpers.
 */

/**
 * @typedef {Object} Vec2
 * @property {number} x - X coordinate in meters
 * @property {number} y - Y coordinate in meters
 */

/**
 * @typedef {Object} MaterialProperties
 * @property {string} name - Display name
 * @property {number} density - kg/m³
 * @property {number} specificHeat - J/(kg·K)
 * @property {number} thermalConductivity - W/(m·K)
 * @property {number} emissivity - 0-1 radiative emissivity
 * @property {number} reflectivity - 0-1 reflectivity for incident radiation
 */

/**
 * Material property database.
 * @type {Object.<string, MaterialProperties>}
 */
export const MATERIALS = {
  log: {
    name: 'Log Wall (Oak)',
    density: 700,
    specificHeat: 2000,
    thermalConductivity: 0.17,
    emissivity: 0.9,
    reflectivity: 0.1
  },
  stone: {
    name: 'Stone',
    density: 2500,
    specificHeat: 800,
    thermalConductivity: 2.5,
    emissivity: 0.93,
    reflectivity: 0.07
  },
  brick: {
    name: 'Brick',
    density: 1800,
    specificHeat: 840,
    thermalConductivity: 0.72,
    emissivity: 0.93,
    reflectivity: 0.07
  },
  aluminum: {
    name: 'Aluminum Sheet',
    density: 2700,
    specificHeat: 900,
    thermalConductivity: 205,
    emissivity: 0.04,
    reflectivity: 0.95
  }
};

/**
 * Physical constants used in calculations.
 */
export const CONSTANTS = {
  STEFAN_BOLTZMANN: 5.670374419e-8, // W/(m²·K⁴)
  GRAVITY: 9.81, // m/s²
  AIR_THERMAL_CONDUCTIVITY: 0.026, // W/(m·K)
  AIR_KINEMATIC_VISCOSITY: 1.5e-5, // m²/s
  AIR_PRANDTL: 0.71,
  AIR_DENSITY: 1.2, // kg/m³ at ~20°C
  HUMAN_BODY_TEMP_K: 310.15 // ~37°C in Kelvin
};

/**
 * Default simulation configuration.
 */
const DEFAULT_STATE = {
  firePower: 8, // kW
  fireActive: true,
  firePosition: { x: 3, y: 0 },

  wallMaterial: 'log',
  wallThickness: 0.15, // m
  wallHeight: 1.5, // m
  wallWidth: 1.2, // m
  wallPosition: { x: 1.5, y: 0 },
  wallTemperature: 278.15, // K (~5°C, starts at ambient)
  wallStoredEnergy: 0, // J

  personPosition: { x: 4, y: 0 },
  personHeight: 1.7, // m
  personFrontArea: 0.5, // m² effective receiving area

  ambientTemp: 5, // °C
  windSpeed: 2, // m/s
  windDirection: 0, // degrees, 0 = from left
  humidity: 60, // %

  timeScale: 1,
  showHeatmap: false,
  simTime: 0, // seconds of simulation time

  weather: {
    fetched: false,
    temperature: null,
    windSpeed: null,
    humidity: null,
    description: ''
  },

  location: {
    latitude: 45.0,
    longitude: 15.0
  }
};

/**
 * Simulation state singleton.
 * @type {typeof DEFAULT_STATE}
 */
export const state = { ...DEFAULT_STATE };

/**
 * Deep-clone default state for reset functionality.
 */
const initialState = JSON.parse(JSON.stringify(DEFAULT_STATE));

/**
 * Resets simulation state to defaults.
 */
export function resetState() {
  Object.assign(state, JSON.parse(JSON.stringify(initialState)));
}

/**
 * Converts Celsius to Kelvin.
 * @param {number} celsius - Temperature in Celsius
 * @returns {number} Temperature in Kelvin
 */
export function celsiusToKelvin(celsius) {
  return celsius + 273.15;
}

/**
 * Converts Kelvin to Celsius.
 * @param {number} kelvin - Temperature in Kelvin
 * @returns {number} Temperature in Celsius
 */
export function kelvinToCelsius(kelvin) {
  return kelvin - 273.15;
}

/**
 * Gets the current ambient temperature in Kelvin.
 * @returns {number}
 */
export function getAmbientTempK() {
  return celsiusToKelvin(state.ambientTemp);
}

/**
 * Calculates fire temperature based on power output.
 * Approximates flame temperature using power scaling.
 * @returns {number} Fire temperature in Kelvin
 */
export function getFireTemperatureK() {
  if (!state.fireActive) {
    return getAmbientTempK();
  }
  return 800 + state.firePower * 50;
}

/**
 * Calculates effective fire surface area based on power.
 * @returns {number} Area in m²
 */
export function getFireArea() {
  if (!state.fireActive) {
    return 0;
  }
  return 0.3 + state.firePower * 0.05;
}

/**
 * Gets wall thermal mass (m * c_p) for energy calculations.
 * @returns {number} Thermal mass in J/K
 */
export function getWallThermalMass() {
  const mat = MATERIALS[state.wallMaterial];
  const volume = state.wallThickness * state.wallHeight * state.wallWidth;
  const mass = volume * mat.density;
  return mass * mat.specificHeat;
}

/**
 * Gets wall surface area facing the fire.
 * @returns {number} Area in m²
 */
export function getWallFaceArea() {
  return state.wallHeight * state.wallWidth;
}

/**
 * Calculates distance between two positions.
 * @param {Vec2} a
 * @param {Vec2} b
 * @returns {number} Distance in meters
 */
export function distance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

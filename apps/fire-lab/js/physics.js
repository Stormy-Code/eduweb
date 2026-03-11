/**
 * @fileoverview Physics engine for Fire Lab.
 * Implements Stefan-Boltzmann radiation, view factors, convection, and transient thermal mass modeling.
 */

import {
  state,
  MATERIALS,
  CONSTANTS,
  getAmbientTempK,
  getFireTemperatureK,
  getFireArea,
  getWallThermalMass,
  getWallFaceArea,
  distance,
  celsiusToKelvin
} from './state.js';

/**
 * @typedef {Object} ViewFactors
 * @property {number} fireToPerson - Fire → Person view factor
 * @property {number} fireToWall - Fire → Wall view factor
 * @property {number} wallToPerson - Wall → Person view factor
 */

/**
 * @typedef {Object} HeatFluxes
 * @property {number} fireRadiative - Total radiative power from fire (W)
 * @property {number} directToPerson - Direct radiation reaching person (W)
 * @property {number} toWall - Radiation absorbed by wall (W)
 * @property {number} wallReradiation - Heat re-radiated by wall (W)
 * @property {number} wallToPerson - Radiation from wall reaching person (W)
 * @property {number} convectiveLoss - Convective heat loss from person (W)
 * @property {number} netPersonGain - Net heat gain by person (W)
 */

/**
 * Calculates geometric view factor between two surfaces.
 * Simplified 2D approximation using distance and effective areas.
 * @param {number} dist - Distance between surfaces (m)
 * @param {number} areaEmitter - Emitting surface area (m²)
 * @param {number} areaReceiver - Receiving surface area (m²)
 * @param {number} [angleFactor=1] - Cosine correction for facing angle
 * @returns {number} View factor (0-1)
 */
function calculateViewFactor(dist, areaEmitter, areaReceiver, angleFactor = 1) {
  if (dist <= 0.1) dist = 0.1;
  const geometricFactor = (areaEmitter * areaReceiver) / (Math.PI * dist * dist);
  const vf = Math.min(1, geometricFactor * angleFactor);
  return Math.max(0.001, vf);
}

/**
 * Computes all view factors for the current scene geometry.
 * @returns {ViewFactors}
 */
export function computeViewFactors() {
  const firePos = state.firePosition;
  const wallPos = state.wallPosition;
  const personPos = state.personPosition;

  const fireArea = getFireArea();
  const wallArea = getWallFaceArea();
  const personArea = state.personFrontArea;

  const dFirePerson = distance(firePos, personPos);
  const dFireWall = distance(firePos, wallPos);
  const dWallPerson = distance(wallPos, personPos);

  const wallBehindFire = wallPos.x < firePos.x;
  const personInFront = personPos.x > firePos.x;
  const wallFacesPerson = wallPos.x < personPos.x;

  let fireToPersonAngle = personInFront ? 1.0 : 0.3;
  let fireToWallAngle = wallBehindFire ? 0.9 : 0.2;
  let wallToPersonAngle = wallFacesPerson ? 0.85 : 0.15;

  const fireToPerson = calculateViewFactor(dFirePerson, fireArea, personArea, fireToPersonAngle);
  const fireToWall = calculateViewFactor(dFireWall, fireArea, wallArea, fireToWallAngle);
  const wallToPerson = calculateViewFactor(dWallPerson, wallArea, personArea, wallToPersonAngle);

  return { fireToPerson, fireToWall, wallToPerson };
}

/**
 * Calculates radiative heat transfer using Stefan-Boltzmann law.
 * q = σ * ε * A * (T_hot^4 - T_cold^4)
 * @param {number} tempHot - Hot surface temperature (K)
 * @param {number} tempCold - Cold surface temperature (K)
 * @param {number} emissivity - Surface emissivity (0-1)
 * @param {number} area - Surface area (m²)
 * @returns {number} Heat transfer rate (W)
 */
function stefanBoltzmann(tempHot, tempCold, emissivity, area) {
  const sigma = CONSTANTS.STEFAN_BOLTZMANN;
  return sigma * emissivity * area * (Math.pow(tempHot, 4) - Math.pow(tempCold, 4));
}

/**
 * Calculates combined natural + forced convection coefficient.
 * @param {number} windSpeed - Wind speed (m/s)
 * @param {number} deltaT - Temperature difference (K)
 * @returns {number} Convection coefficient h (W/(m²·K))
 */
function convectionCoefficient(windSpeed, deltaT) {
  const hNatural = 1.3 * Math.pow(Math.abs(deltaT), 0.25);
  const hForced = 10.45 - windSpeed + 10 * Math.sqrt(windSpeed);
  const hForcedClamped = Math.max(5, Math.min(50, hForced));
  return Math.max(hNatural, hForcedClamped);
}

/**
 * Calculates convective heat loss from a surface.
 * @param {number} surfaceTemp - Surface temperature (K)
 * @param {number} ambientTemp - Ambient temperature (K)
 * @param {number} area - Surface area (m²)
 * @param {number} windSpeed - Wind speed (m/s)
 * @returns {number} Convective heat loss (W)
 */
function convectiveHeatLoss(surfaceTemp, ambientTemp, area, windSpeed) {
  const deltaT = surfaceTemp - ambientTemp;
  const h = convectionCoefficient(windSpeed, deltaT);
  return h * area * deltaT;
}

/**
 * Updates wall temperature using lumped thermal mass model.
 * dE/dt = q_in - q_out
 * T_wall = T_ref + E / (m * c_p)
 * @param {number} qIn - Heat input to wall (W)
 * @param {number} qOut - Heat output from wall (W)
 * @param {number} dt - Time step (s)
 */
function updateWallThermalMass(qIn, qOut, dt) {
  const netHeatRate = qIn - qOut;
  state.wallStoredEnergy += netHeatRate * dt;
  state.wallStoredEnergy = Math.max(0, state.wallStoredEnergy);

  const thermalMass = getWallThermalMass();
  const ambientK = getAmbientTempK();

  state.wallTemperature = ambientK + state.wallStoredEnergy / thermalMass;

  const maxWallTemp = celsiusToKelvin(400);
  state.wallTemperature = Math.min(state.wallTemperature, maxWallTemp);
}

/**
 * Computes all heat fluxes for the current simulation state.
 * @returns {HeatFluxes}
 */
export function computeHeatFluxes() {
  const viewFactors = computeViewFactors();
  const fireTemp = getFireTemperatureK();
  const ambientK = getAmbientTempK();
  const wallTemp = state.wallTemperature;
  const personTemp = CONSTANTS.HUMAN_BODY_TEMP_K;

  const fireArea = getFireArea();
  const wallArea = getWallFaceArea();
  const personArea = state.personFrontArea;

  const mat = MATERIALS[state.wallMaterial];

  const fireRadiative = state.fireActive
    ? stefanBoltzmann(fireTemp, ambientK, 0.95, fireArea)
    : 0;

  const directToPerson = fireRadiative * viewFactors.fireToPerson;

  const incidentOnWall = fireRadiative * viewFactors.fireToWall;
  const absorbedByWall = incidentOnWall * mat.emissivity;
  const reflectedByWall = incidentOnWall * mat.reflectivity;

  const wallReradiation = stefanBoltzmann(wallTemp, ambientK, mat.emissivity, wallArea);
  const wallConvectionLoss = convectiveHeatLoss(wallTemp, ambientK, wallArea * 2, state.windSpeed);

  const wallToPerson = (wallReradiation + reflectedByWall * 0.3) * viewFactors.wallToPerson;

  const convectiveLoss = convectiveHeatLoss(personTemp, ambientK, personArea * 2, state.windSpeed);
  const humidityFactor = 1 + (state.humidity - 50) * 0.002;
  const adjustedConvectiveLoss = convectiveLoss * humidityFactor;

  const netPersonGain = directToPerson + wallToPerson - adjustedConvectiveLoss;

  return {
    fireRadiative,
    directToPerson,
    toWall: absorbedByWall,
    wallReradiation,
    wallToPerson,
    convectiveLoss: adjustedConvectiveLoss,
    netPersonGain
  };
}

/**
 * Advances the physics simulation by one time step.
 * @param {number} dt - Real time delta (seconds)
 */
export function step(dt) {
  const scaledDt = dt * state.timeScale;
  state.simTime += scaledDt;

  const fluxes = computeHeatFluxes();

  const qInWall = fluxes.toWall;
  const qOutWall = fluxes.wallReradiation +
    convectiveHeatLoss(state.wallTemperature, getAmbientTempK(), getWallFaceArea() * 2, state.windSpeed);

  updateWallThermalMass(qInWall, qOutWall, scaledDt);
}

/**
 * Gets current computed metrics for display.
 * @returns {Object} Metrics object
 */
export function getMetrics() {
  const fluxes = computeHeatFluxes();
  const viewFactors = computeViewFactors();

  return {
    fireTemp: getFireTemperatureK(),
    wallTemp: state.wallTemperature,
    personHeatGain: fluxes.netPersonGain,
    radiativeFlux: fluxes.fireRadiative,
    convectiveLoss: fluxes.convectiveLoss,
    wallStoredEnergy: state.wallStoredEnergy,
    viewFactors,
    simTime: state.simTime
  };
}

/**
 * Generates a temperature field for heatmap visualization.
 * Samples temperature estimates at grid points based on distance from heat sources.
 * @param {number} gridWidth - Number of horizontal samples
 * @param {number} gridHeight - Number of vertical samples
 * @param {number} sceneWidth - Scene width in meters
 * @param {number} sceneHeight - Scene height in meters
 * @returns {Float32Array} Temperature values in Kelvin
 */
export function generateHeatmapField(gridWidth, gridHeight, sceneWidth, sceneHeight) {
  const field = new Float32Array(gridWidth * gridHeight);
  const fireTemp = getFireTemperatureK();
  const wallTemp = state.wallTemperature;
  const ambientK = getAmbientTempK();
  const firePos = state.firePosition;
  const wallPos = state.wallPosition;
  const fireArea = getFireArea();
  const fireRadius = Math.sqrt(fireArea / Math.PI);

  for (let j = 0; j < gridHeight; j++) {
    for (let i = 0; i < gridWidth; i++) {
      const x = (i / (gridWidth - 1)) * sceneWidth;
      const y = (j / (gridHeight - 1)) * sceneHeight;

      const dFire = Math.sqrt((x - firePos.x) ** 2 + (y - firePos.y) ** 2);
      const dWall = Math.sqrt((x - wallPos.x) ** 2 + (y - wallPos.y) ** 2);

      let temp = ambientK;

      if (state.fireActive && dFire < 5) {
        const fireFalloff = Math.exp(-dFire / (fireRadius * 3 + 0.5));
        temp += (fireTemp - ambientK) * fireFalloff * 0.6;
      }

      if (dWall < 3 && wallTemp > ambientK) {
        const wallFalloff = Math.exp(-dWall / 1.0);
        temp += (wallTemp - ambientK) * wallFalloff * 0.4;
      }

      field[j * gridWidth + i] = temp;
    }
  }

  return field;
}

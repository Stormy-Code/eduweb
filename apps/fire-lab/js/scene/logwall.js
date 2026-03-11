/**
 * @fileoverview Log wall reflector model for the 3D scene.
 * Creates stacked log geometry with temperature-driven emissive glow.
 */

import * as THREE from 'three';

const LOG_ROWS = 5;
const LOGS_PER_ROW = 6;
const LOG_RADIUS = 0.12;
const LOG_LENGTH = 1.8;

/** @type {THREE.InstancedMesh} */
let logMesh;
/** @type {THREE.MeshStandardMaterial} */
let logMaterial;
/** @type {THREE.Mesh} */
let supportPost1;
/** @type {THREE.Mesh} */
let supportPost2;

/**
 * Creates the log wall group and adds it to the scene.
 * @param {THREE.Scene} scene
 * @returns {THREE.Group}
 */
export function createLogWall(scene) {
  const group = new THREE.Group();
  group.name = 'logwall';

  createLogs(group);
  createSupportPosts(group);

  // Wall faces toward positive Z (toward the fire)
  // Logs run along X axis, wall reflects heat back toward shelter
  group.rotation.y = 0;

  scene.add(group);
  return group;
}

function createLogs(group) {
  const logGeometry = new THREE.CylinderGeometry(LOG_RADIUS, LOG_RADIUS * 1.05, LOG_LENGTH, 12);
  logGeometry.rotateZ(Math.PI / 2);

  logMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a3d2b,
    roughness: 0.85,
    metalness: 0.0,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0
  });

  const instanceCount = LOG_ROWS * LOGS_PER_ROW;
  logMesh = new THREE.InstancedMesh(logGeometry, logMaterial, instanceCount);
  logMesh.castShadow = true;
  logMesh.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);

  let instanceIndex = 0;
  for (let row = 0; row < LOG_ROWS; row++) {
    const rowOffset = (row % 2) * LOG_RADIUS * 0.5;

    for (let col = 0; col < LOGS_PER_ROW; col++) {
      const x = 0;
      const y = row * LOG_RADIUS * 1.8 + LOG_RADIUS + 0.05;
      const z = (col - (LOGS_PER_ROW - 1) / 2) * LOG_RADIUS * 2.2 + rowOffset;

      position.set(x, y, z);

      const randomRotation = (Math.random() - 0.5) * 0.05;
      quaternion.setFromEuler(new THREE.Euler(0, randomRotation, 0));

      const scaleVariation = 0.95 + Math.random() * 0.1;
      scale.set(1, scaleVariation, scaleVariation);

      matrix.compose(position, quaternion, scale);
      logMesh.setMatrixAt(instanceIndex, matrix);

      const colorVariation = 0.9 + Math.random() * 0.2;
      const color = new THREE.Color(0x5a3d2b).multiplyScalar(colorVariation);
      logMesh.setColorAt(instanceIndex, color);

      instanceIndex++;
    }
  }

  logMesh.instanceMatrix.needsUpdate = true;
  if (logMesh.instanceColor) logMesh.instanceColor.needsUpdate = true;

  group.add(logMesh);

  addBarkDetails(group);
}

function addBarkDetails(group) {
  const barkMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a2515,
    roughness: 1.0,
    metalness: 0.0
  });

  for (let i = 0; i < 20; i++) {
    const barkGeometry = new THREE.BoxGeometry(
      0.02,
      0.05 + Math.random() * 0.1,
      0.03 + Math.random() * 0.05
    );

    const bark = new THREE.Mesh(barkGeometry, barkMaterial);

    const row = Math.floor(Math.random() * LOG_ROWS);
    const col = Math.floor(Math.random() * LOGS_PER_ROW);
    const angle = Math.random() * Math.PI * 2;

    const x = LOG_RADIUS * 1.02;
    const y = row * LOG_RADIUS * 1.8 + LOG_RADIUS + 0.05;
    const z = (col - (LOGS_PER_ROW - 1) / 2) * LOG_RADIUS * 2.2 + (row % 2) * LOG_RADIUS * 0.5;

    bark.position.set(
      x * Math.cos(angle),
      y + (Math.random() - 0.5) * LOG_RADIUS,
      z + Math.sin(angle) * LOG_RADIUS
    );
    bark.rotation.set(
      Math.random() * 0.3,
      Math.random() * Math.PI,
      Math.random() * 0.3
    );

    group.add(bark);
  }
}

function createSupportPosts(group) {
  const postGeometry = new THREE.CylinderGeometry(0.08, 0.1, 1.3, 8);
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3020,
    roughness: 0.9,
    metalness: 0.0
  });

  supportPost1 = new THREE.Mesh(postGeometry, postMaterial);
  supportPost1.position.set(-0.1, 0.65, -LOG_LENGTH / 2 - 0.15);
  supportPost1.rotation.z = 0.1;
  supportPost1.castShadow = true;
  supportPost1.receiveShadow = true;
  group.add(supportPost1);

  supportPost2 = new THREE.Mesh(postGeometry, postMaterial);
  supportPost2.position.set(-0.1, 0.65, LOG_LENGTH / 2 + 0.15);
  supportPost2.rotation.z = 0.1;
  supportPost2.castShadow = true;
  supportPost2.receiveShadow = true;
  group.add(supportPost2);

  const braceGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
  const brace1 = new THREE.Mesh(braceGeometry, postMaterial);
  brace1.position.set(-0.3, 0.3, -LOG_LENGTH / 2 - 0.15);
  brace1.rotation.z = Math.PI / 4;
  group.add(brace1);

  const brace2 = new THREE.Mesh(braceGeometry, postMaterial);
  brace2.position.set(-0.3, 0.3, LOG_LENGTH / 2 + 0.15);
  brace2.rotation.z = Math.PI / 4;
  group.add(brace2);
}

/**
 * Updates log wall appearance based on temperature.
 * @param {THREE.Group} group
 * @param {Object} state
 */
export function updateLogWall(group, state) {
  if (!group || !logMaterial) return;

  const ambientK = state.ambientTemp + 273.15;
  const wallTemp = state.wallTemperature;
  const tempDiff = wallTemp - ambientK;

  const glowIntensity = Math.max(0, Math.min(1, tempDiff / 150));

  if (glowIntensity > 0.05) {
    const r = Math.min(1, glowIntensity * 1.5);
    const g = Math.min(0.4, glowIntensity * 0.5);
    const b = Math.min(0.1, glowIntensity * 0.1);

    logMaterial.emissive.setRGB(r * 0.8, g * 0.3, b * 0.1);
    logMaterial.emissiveIntensity = glowIntensity * 2;

    const baseColor = new THREE.Color(0x5a3d2b);
    const heatedColor = new THREE.Color(0x7a4a30);
    logMaterial.color.lerpColors(baseColor, heatedColor, glowIntensity * 0.5);
  } else {
    logMaterial.emissive.setRGB(0, 0, 0);
    logMaterial.emissiveIntensity = 0;
    logMaterial.color.setHex(0x5a3d2b);
  }

  const materialType = state.wallMaterial;
  if (materialType === 'stone') {
    logMaterial.color.setHex(0x6a6a6a);
    logMaterial.roughness = 0.9;
  } else if (materialType === 'brick') {
    logMaterial.color.setHex(0x8b4513);
    logMaterial.roughness = 0.85;
  } else if (materialType === 'aluminum') {
    logMaterial.color.setHex(0xaaaaaa);
    logMaterial.roughness = 0.3;
    logMaterial.metalness = 0.8;
  } else {
    if (glowIntensity <= 0.05) {
      logMaterial.color.setHex(0x5a3d2b);
    }
    logMaterial.roughness = 0.85;
    logMaterial.metalness = 0.0;
  }
}

/**
 * @fileoverview Lean-to tarp shelter model for the 3D scene.
 * Creates tarp geometry with support poles and semi-transparent fabric material.
 */

import * as THREE from 'three';

const TARP_WIDTH = 2.2;
const TARP_LENGTH = 2.5;
const RIDGE_HEIGHT = 1.8;
const GROUND_HEIGHT = 0.1;

/** @type {THREE.Mesh} */
let tarpMesh;
/** @type {THREE.Mesh[]} */
let poles = [];
/** @type {THREE.Line[]} */
let guyLines = [];

/**
 * Creates the shelter group and adds it to the scene.
 * @param {THREE.Scene} scene
 * @returns {THREE.Group}
 */
export function createShelter(scene) {
  const group = new THREE.Group();
  group.name = 'shelter';

  createTarp(group);
  createPoles(group);
  createGuyLines(group);
  createGroundSheet(group);

  // Open side faces the fire (negative Z direction toward fire at Z=0)
  group.rotation.y = 0;

  scene.add(group);
  return group;
}

function createTarp(group) {
  const tarpGeometry = new THREE.BufferGeometry();

  const vertices = new Float32Array([
    -TARP_WIDTH / 2, RIDGE_HEIGHT, -TARP_LENGTH / 2,
    TARP_WIDTH / 2, RIDGE_HEIGHT, -TARP_LENGTH / 2,
    TARP_WIDTH / 2, GROUND_HEIGHT, TARP_LENGTH / 2,
    -TARP_WIDTH / 2, GROUND_HEIGHT, TARP_LENGTH / 2,

    -TARP_WIDTH / 2, RIDGE_HEIGHT, -TARP_LENGTH / 2,
    TARP_WIDTH / 2, RIDGE_HEIGHT, -TARP_LENGTH / 2,
    TARP_WIDTH / 2, GROUND_HEIGHT, TARP_LENGTH / 2,
    -TARP_WIDTH / 2, GROUND_HEIGHT, TARP_LENGTH / 2
  ]);

  const indices = [
    0, 1, 2,
    0, 2, 3,
    4, 6, 5,
    4, 7, 6
  ];

  const uvs = new Float32Array([
    0, 1,
    1, 1,
    1, 0,
    0, 0,
    0, 1,
    1, 1,
    1, 0,
    0, 0
  ]);

  tarpGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  tarpGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  tarpGeometry.setIndex(indices);
  tarpGeometry.computeVertexNormals();

  const tarpMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a5a3a,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    alphaTest: 0.1
  });

  tarpMesh = new THREE.Mesh(tarpGeometry, tarpMaterial);
  tarpMesh.castShadow = true;
  tarpMesh.receiveShadow = true;
  group.add(tarpMesh);

  addTarpDetails(group);
}

function addTarpDetails(group) {
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x2a3a2a,
    linewidth: 2
  });

  const edgePoints = [
    new THREE.Vector3(-TARP_WIDTH / 2, RIDGE_HEIGHT, -TARP_LENGTH / 2),
    new THREE.Vector3(TARP_WIDTH / 2, RIDGE_HEIGHT, -TARP_LENGTH / 2),
    new THREE.Vector3(TARP_WIDTH / 2, GROUND_HEIGHT, TARP_LENGTH / 2),
    new THREE.Vector3(-TARP_WIDTH / 2, GROUND_HEIGHT, TARP_LENGTH / 2),
    new THREE.Vector3(-TARP_WIDTH / 2, RIDGE_HEIGHT, -TARP_LENGTH / 2)
  ];

  const edgeGeometry = new THREE.BufferGeometry().setFromPoints(edgePoints);
  const edge = new THREE.Line(edgeGeometry, edgeMaterial);
  group.add(edge);

  const grommmetMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555,
    metalness: 0.5,
    roughness: 0.5
  });

  const grommetPositions = [
    [-TARP_WIDTH / 2, RIDGE_HEIGHT, -TARP_LENGTH / 2],
    [TARP_WIDTH / 2, RIDGE_HEIGHT, -TARP_LENGTH / 2],
    [-TARP_WIDTH / 2, GROUND_HEIGHT + 0.05, TARP_LENGTH / 2],
    [TARP_WIDTH / 2, GROUND_HEIGHT + 0.05, TARP_LENGTH / 2],
    [0, RIDGE_HEIGHT, -TARP_LENGTH / 2]
  ];

  const grommetGeometry = new THREE.TorusGeometry(0.03, 0.008, 8, 12);

  grommetPositions.forEach(pos => {
    const grommet = new THREE.Mesh(grommetGeometry, grommmetMaterial);
    grommet.position.set(pos[0], pos[1], pos[2]);
    grommet.rotation.x = Math.PI / 2;
    group.add(grommet);
  });
}

function createPoles(group) {
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x6a5a4a,
    roughness: 0.9,
    metalness: 0.0
  });

  const mainPoleGeometry = new THREE.CylinderGeometry(0.03, 0.04, RIDGE_HEIGHT + 0.3, 8);
  const mainPole = new THREE.Mesh(mainPoleGeometry, poleMaterial);
  mainPole.position.set(0, (RIDGE_HEIGHT + 0.3) / 2 - 0.15, -TARP_LENGTH / 2 - 0.1);
  mainPole.rotation.x = 0.1;
  mainPole.castShadow = true;
  poles.push(mainPole);
  group.add(mainPole);

  const supportPoleGeometry = new THREE.CylinderGeometry(0.02, 0.025, 1.2, 6);

  const leftSupport = new THREE.Mesh(supportPoleGeometry, poleMaterial);
  leftSupport.position.set(-TARP_WIDTH / 2 - 0.1, 0.5, -TARP_LENGTH / 2);
  leftSupport.rotation.z = -0.3;
  leftSupport.rotation.x = 0.1;
  leftSupport.castShadow = true;
  poles.push(leftSupport);
  group.add(leftSupport);

  const rightSupport = new THREE.Mesh(supportPoleGeometry, poleMaterial);
  rightSupport.position.set(TARP_WIDTH / 2 + 0.1, 0.5, -TARP_LENGTH / 2);
  rightSupport.rotation.z = 0.3;
  rightSupport.rotation.x = 0.1;
  rightSupport.castShadow = true;
  poles.push(rightSupport);
  group.add(rightSupport);

  const ridgePoleGeometry = new THREE.CylinderGeometry(0.025, 0.025, TARP_WIDTH + 0.4, 8);
  const ridgePole = new THREE.Mesh(ridgePoleGeometry, poleMaterial);
  ridgePole.position.set(0, RIDGE_HEIGHT + 0.02, -TARP_LENGTH / 2);
  ridgePole.rotation.z = Math.PI / 2;
  ridgePole.castShadow = true;
  poles.push(ridgePole);
  group.add(ridgePole);
}

function createGuyLines(group) {
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x888888,
    transparent: true,
    opacity: 0.7
  });

  const lineConfigs = [
    {
      start: [-TARP_WIDTH / 2, RIDGE_HEIGHT, -TARP_LENGTH / 2],
      end: [-TARP_WIDTH / 2 - 0.8, 0, -TARP_LENGTH / 2 - 0.5]
    },
    {
      start: [TARP_WIDTH / 2, RIDGE_HEIGHT, -TARP_LENGTH / 2],
      end: [TARP_WIDTH / 2 + 0.8, 0, -TARP_LENGTH / 2 - 0.5]
    },
    {
      start: [0, RIDGE_HEIGHT, -TARP_LENGTH / 2],
      end: [0, 0, -TARP_LENGTH / 2 - 1]
    },
    {
      start: [-TARP_WIDTH / 2, GROUND_HEIGHT, TARP_LENGTH / 2],
      end: [-TARP_WIDTH / 2 - 0.5, 0, TARP_LENGTH / 2 + 0.3]
    },
    {
      start: [TARP_WIDTH / 2, GROUND_HEIGHT, TARP_LENGTH / 2],
      end: [TARP_WIDTH / 2 + 0.5, 0, TARP_LENGTH / 2 + 0.3]
    }
  ];

  lineConfigs.forEach(config => {
    const points = [
      new THREE.Vector3(...config.start),
      new THREE.Vector3(...config.end)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, lineMaterial);
    guyLines.push(line);
    group.add(line);

    const stakeGeometry = new THREE.ConeGeometry(0.03, 0.15, 4);
    const stakeMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a5a5a,
      roughness: 0.8,
      metalness: 0.2
    });
    const stake = new THREE.Mesh(stakeGeometry, stakeMaterial);
    stake.position.set(config.end[0], 0.05, config.end[2]);
    stake.rotation.x = Math.PI;
    group.add(stake);
  });
}

function createGroundSheet(group) {
  const sheetGeometry = new THREE.PlaneGeometry(TARP_WIDTH - 0.2, TARP_LENGTH - 0.3);
  const sheetMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3a2a,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  const sheet = new THREE.Mesh(sheetGeometry, sheetMaterial);
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(0, 0.02, 0.2);
  sheet.receiveShadow = true;
  group.add(sheet);
}

/**
 * Updates shelter based on simulation state.
 * @param {THREE.Group} group
 * @param {Object} state
 */
export function updateShelter(group, state) {
  if (!group || !tarpMesh) return;

  const positions = tarpMesh.geometry.attributes.position;
  const time = state.simTime || 0;
  const windEffect = state.windSpeed * 0.01;

  for (let i = 0; i < positions.count; i++) {
    const baseY = i < 2 || (i >= 4 && i < 6) ? RIDGE_HEIGHT : GROUND_HEIGHT;
    const wave = Math.sin(time * 2 + i) * windEffect;
    positions.array[i * 3 + 1] = baseY + wave;
  }

  positions.needsUpdate = true;
  tarpMesh.geometry.computeVertexNormals();
}

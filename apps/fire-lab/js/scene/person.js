/**
 * @fileoverview Person model for the 3D scene.
 * Creates a seated humanoid figure positioned under the tarp facing the fire.
 */

import * as THREE from 'three';

/** @type {THREE.Group} */
let bodyGroup;
/** @type {THREE.Mesh} */
let torso;
/** @type {THREE.Mesh} */
let head;
/** @type {THREE.MeshStandardMaterial} */
let skinMaterial;
/** @type {THREE.MeshStandardMaterial} */
let clothingMaterial;

/**
 * Creates the person group and adds it to the scene.
 * @param {THREE.Scene} scene
 * @returns {THREE.Group}
 */
export function createPerson(scene) {
  const group = new THREE.Group();
  group.name = 'person';

  bodyGroup = new THREE.Group();

  createMaterials();
  createBody(bodyGroup);
  createHead(bodyGroup);
  createArms(bodyGroup);
  createLegs(bodyGroup);
  createDetails(bodyGroup);

  bodyGroup.position.set(0, 0, 0);
  // Face toward the fire (negative Z direction)
  bodyGroup.rotation.y = Math.PI;

  group.add(bodyGroup);

  scene.add(group);
  return group;
}

function createMaterials() {
  skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4a574,
    roughness: 0.8,
    metalness: 0.0
  });

  clothingMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a4a3a,
    roughness: 0.85,
    metalness: 0.0
  });
}

function createBody(group) {
  const torsoGeometry = new THREE.CapsuleGeometry(0.18, 0.35, 8, 12);
  torso = new THREE.Mesh(torsoGeometry, clothingMaterial);
  torso.position.set(0, 0.55, 0);
  torso.rotation.x = -0.2;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const jacketGeometry = new THREE.CylinderGeometry(0.22, 0.2, 0.15, 12);
  const jacketMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a2a1a,
    roughness: 0.9,
    metalness: 0.0
  });
  const jacketBottom = new THREE.Mesh(jacketGeometry, jacketMaterial);
  jacketBottom.position.set(0, 0.35, 0);
  jacketBottom.castShadow = true;
  group.add(jacketBottom);

  const collarGeometry = new THREE.TorusGeometry(0.12, 0.04, 8, 16, Math.PI);
  const collar = new THREE.Mesh(collarGeometry, jacketMaterial);
  collar.position.set(0, 0.75, 0.08);
  collar.rotation.x = Math.PI / 2;
  collar.rotation.z = Math.PI;
  group.add(collar);
}

function createHead(group) {
  const headGeometry = new THREE.SphereGeometry(0.12, 16, 12);
  head = new THREE.Mesh(headGeometry, skinMaterial);
  head.position.set(0, 0.92, 0.05);
  head.scale.set(1, 1.1, 0.95);
  head.castShadow = true;
  group.add(head);

  const hatMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.9,
    metalness: 0.0
  });

  const hatBaseGeometry = new THREE.CylinderGeometry(0.14, 0.13, 0.08, 16);
  const hatBase = new THREE.Mesh(hatBaseGeometry, hatMaterial);
  hatBase.position.set(0, 1.02, 0.02);
  hatBase.rotation.x = -0.1;
  group.add(hatBase);

  const hatTopGeometry = new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const hatTop = new THREE.Mesh(hatTopGeometry, hatMaterial);
  hatTop.position.set(0, 1.06, 0.02);
  hatTop.rotation.x = -0.1;
  group.add(hatTop);

  const earGeometry = new THREE.SphereGeometry(0.03, 8, 6);
  const leftEar = new THREE.Mesh(earGeometry, skinMaterial);
  leftEar.position.set(-0.11, 0.9, 0.02);
  group.add(leftEar);

  const rightEar = new THREE.Mesh(earGeometry, skinMaterial);
  rightEar.position.set(0.11, 0.9, 0.02);
  group.add(rightEar);

  createFace(group);
}

function createFace(group) {
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.3,
    metalness: 0.1
  });

  const eyeGeometry = new THREE.SphereGeometry(0.015, 8, 6);

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.04, 0.94, 0.12);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.04, 0.94, 0.12);
  group.add(rightEye);

  const noseGeometry = new THREE.ConeGeometry(0.02, 0.04, 6);
  const nose = new THREE.Mesh(noseGeometry, skinMaterial);
  nose.position.set(0, 0.9, 0.13);
  nose.rotation.x = -Math.PI / 2;
  group.add(nose);
}

function createArms(group) {
  const upperArmGeometry = new THREE.CapsuleGeometry(0.045, 0.2, 6, 8);
  const lowerArmGeometry = new THREE.CapsuleGeometry(0.04, 0.18, 6, 8);

  const leftUpperArm = new THREE.Mesh(upperArmGeometry, clothingMaterial);
  leftUpperArm.position.set(-0.25, 0.6, 0.1);
  leftUpperArm.rotation.z = 0.5;
  leftUpperArm.rotation.x = 0.3;
  leftUpperArm.castShadow = true;
  group.add(leftUpperArm);

  const leftLowerArm = new THREE.Mesh(lowerArmGeometry, clothingMaterial);
  leftLowerArm.position.set(-0.32, 0.42, 0.22);
  leftLowerArm.rotation.z = 0.8;
  leftLowerArm.rotation.x = -0.5;
  leftLowerArm.castShadow = true;
  group.add(leftLowerArm);

  const rightUpperArm = new THREE.Mesh(upperArmGeometry, clothingMaterial);
  rightUpperArm.position.set(0.25, 0.6, 0.1);
  rightUpperArm.rotation.z = -0.5;
  rightUpperArm.rotation.x = 0.3;
  rightUpperArm.castShadow = true;
  group.add(rightUpperArm);

  const rightLowerArm = new THREE.Mesh(lowerArmGeometry, clothingMaterial);
  rightLowerArm.position.set(0.32, 0.42, 0.22);
  rightLowerArm.rotation.z = -0.8;
  rightLowerArm.rotation.x = -0.5;
  rightLowerArm.castShadow = true;
  group.add(rightLowerArm);

  createHands(group);
}

function createHands(group) {
  const handGeometry = new THREE.SphereGeometry(0.04, 8, 6);
  const handMaterial = skinMaterial;

  const leftHand = new THREE.Mesh(handGeometry, handMaterial);
  leftHand.position.set(-0.28, 0.28, 0.35);
  leftHand.scale.set(1, 0.6, 1.2);
  group.add(leftHand);

  const rightHand = new THREE.Mesh(handGeometry, handMaterial);
  rightHand.position.set(0.28, 0.28, 0.35);
  rightHand.scale.set(1, 0.6, 1.2);
  group.add(rightHand);
}

function createLegs(group) {
  const pantsMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3a4a,
    roughness: 0.85,
    metalness: 0.0
  });

  const thighGeometry = new THREE.CapsuleGeometry(0.08, 0.25, 6, 8);

  const leftThigh = new THREE.Mesh(thighGeometry, pantsMaterial);
  leftThigh.position.set(-0.1, 0.25, 0.15);
  leftThigh.rotation.x = Math.PI / 2 - 0.3;
  leftThigh.castShadow = true;
  group.add(leftThigh);

  const rightThigh = new THREE.Mesh(thighGeometry, pantsMaterial);
  rightThigh.position.set(0.1, 0.25, 0.15);
  rightThigh.rotation.x = Math.PI / 2 - 0.3;
  rightThigh.castShadow = true;
  group.add(rightThigh);

  const shinGeometry = new THREE.CapsuleGeometry(0.06, 0.22, 6, 8);

  const leftShin = new THREE.Mesh(shinGeometry, pantsMaterial);
  leftShin.position.set(-0.1, 0.15, 0.42);
  leftShin.rotation.x = 0.2;
  leftShin.castShadow = true;
  group.add(leftShin);

  const rightShin = new THREE.Mesh(shinGeometry, pantsMaterial);
  rightShin.position.set(0.1, 0.15, 0.42);
  rightShin.rotation.x = 0.2;
  rightShin.castShadow = true;
  group.add(rightShin);

  createFeet(group);
}

function createFeet(group) {
  const bootMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a2a1a,
    roughness: 0.9,
    metalness: 0.0
  });

  const bootGeometry = new THREE.BoxGeometry(0.1, 0.08, 0.18);

  const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
  leftBoot.position.set(-0.1, 0.04, 0.58);
  leftBoot.castShadow = true;
  group.add(leftBoot);

  const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
  rightBoot.position.set(0.1, 0.04, 0.58);
  rightBoot.castShadow = true;
  group.add(rightBoot);
}

function createDetails(group) {
  const backpackMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3a2a,
    roughness: 0.9,
    metalness: 0.0
  });

  const backpackGeometry = new THREE.BoxGeometry(0.3, 0.35, 0.15);
  const backpack = new THREE.Mesh(backpackGeometry, backpackMaterial);
  backpack.position.set(0.4, 0.2, 0);
  backpack.rotation.y = 0.2;
  backpack.castShadow = true;
  group.add(backpack);

  const bedrollGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12);
  const bedrollMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a4a3a,
    roughness: 0.85,
    metalness: 0.0
  });
  const bedroll = new THREE.Mesh(bedrollGeometry, bedrollMaterial);
  bedroll.position.set(0.4, 0.42, 0);
  bedroll.rotation.z = Math.PI / 2;
  bedroll.castShadow = true;
  group.add(bedroll);
}

/**
 * Updates person based on simulation state.
 * @param {THREE.Group} group
 * @param {Object} state
 */
export function updatePerson(group, state) {
  if (!group || !bodyGroup) return;

  const time = state.simTime || 0;

  if (head) {
    head.rotation.y = Math.sin(time * 0.5) * 0.1;
  }

  if (torso) {
    torso.rotation.z = Math.sin(time * 0.3) * 0.02;
  }

  const heatGain = state.fireActive ? state.firePower / 20 : 0;
  if (skinMaterial) {
    const warmth = Math.min(1, heatGain * 0.5);
    const r = 0.83 + warmth * 0.1;
    const g = 0.65 - warmth * 0.05;
    const b = 0.46 - warmth * 0.1;
    skinMaterial.color.setRGB(r, g, b);
  }
}

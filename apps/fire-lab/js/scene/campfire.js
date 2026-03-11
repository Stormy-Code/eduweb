/**
 * @fileoverview Campfire model for the 3D scene.
 * Creates animated flames, glowing embers, point light, and log fuel geometry.
 */

import * as THREE from 'three';

/** @type {THREE.PointLight} */
let fireLight;
/** @type {THREE.PointLight} */
let fireLightSecondary;
/** @type {THREE.Mesh[]} */
let flames = [];
/** @type {THREE.Points} */
let embers;
/** @type {THREE.Points} */
let sparks;
/** @type {number} */
let time = 0;

const FLAME_COUNT = 8;
const EMBER_COUNT = 100;
const SPARK_COUNT = 30;

/**
 * Creates the campfire group and adds it to the scene.
 * @param {THREE.Scene} scene
 * @returns {THREE.Group}
 */
export function createCampfire(scene) {
  const group = new THREE.Group();
  group.name = 'campfire';

  createLogs(group);
  createFlames(group);
  createEmbers(group);
  createSparks(group);
  createFireLights(group);

  scene.add(group);
  return group;
}

function createLogs(group) {
  const logMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    roughness: 0.9,
    metalness: 0.0
  });

  const charredMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a0a05,
    roughness: 1.0,
    metalness: 0.0,
    emissive: 0x331100,
    emissiveIntensity: 0.3
  });

  const logPositions = [
    { x: -0.3, z: -0.15, rot: 0.3 },
    { x: 0.3, z: -0.15, rot: -0.3 },
    { x: -0.25, z: 0.2, rot: 0.5 },
    { x: 0.25, z: 0.2, rot: -0.5 },
    { x: 0, z: -0.3, rot: Math.PI / 2 }
  ];

  logPositions.forEach((pos, i) => {
    const logGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 8);
    const log = new THREE.Mesh(logGeometry, i < 2 ? charredMaterial : logMaterial);
    log.position.set(pos.x, 0.1, pos.z);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = pos.rot;
    log.castShadow = true;
    log.receiveShadow = true;
    group.add(log);
  });

  const stoneGeometry = new THREE.DodecahedronGeometry(0.12, 0);
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a,
    roughness: 0.85,
    metalness: 0.1
  });

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 0.5;
    const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
    stone.position.set(
      Math.cos(angle) * radius,
      0.08,
      Math.sin(angle) * radius
    );
    stone.rotation.set(Math.random(), Math.random(), Math.random());
    stone.scale.setScalar(0.6 + Math.random() * 0.4);
    stone.castShadow = true;
    stone.receiveShadow = true;
    group.add(stone);
  }
}

function createFlames(group) {
  const flameShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      intensity: { value: 1.0 },
      baseColor: { value: new THREE.Color(0xff6600) },
      tipColor: { value: new THREE.Color(0xffff00) }
    },
    vertexShader: `
      uniform float time;
      uniform float intensity;
      varying vec2 vUv;
      varying float vHeight;
      
      void main() {
        vUv = uv;
        vHeight = position.y;
        
        vec3 pos = position;
        float wave = sin(time * 8.0 + position.y * 5.0) * 0.05 * intensity;
        float wave2 = cos(time * 6.0 + position.y * 3.0) * 0.03 * intensity;
        pos.x += wave;
        pos.z += wave2;
        pos.y *= 0.8 + intensity * 0.4;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 tipColor;
      uniform float intensity;
      varying vec2 vUv;
      varying float vHeight;
      
      void main() {
        float gradient = smoothstep(0.0, 1.0, vHeight);
        vec3 color = mix(baseColor, tipColor, gradient);
        
        float alpha = (1.0 - gradient) * intensity;
        alpha *= 0.9 - vUv.x * 0.3;
        
        gl_FragColor = vec4(color, alpha * 0.85);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  for (let i = 0; i < FLAME_COUNT; i++) {
    const height = 0.5 + Math.random() * 0.3;
    const flameGeometry = new THREE.ConeGeometry(0.12, height, 6, 4);

    const flameMaterial = flameShaderMaterial.clone();
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);

    const angle = (i / FLAME_COUNT) * Math.PI * 2;
    const radius = 0.1 + Math.random() * 0.1;
    flame.position.set(
      Math.cos(angle) * radius,
      height / 2 + 0.15,
      Math.sin(angle) * radius
    );

    flame.userData.baseHeight = height;
    flame.userData.phase = Math.random() * Math.PI * 2;
    flames.push(flame);
    group.add(flame);
  }
}

function createEmbers(group) {
  const emberGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(EMBER_COUNT * 3);
  const colors = new Float32Array(EMBER_COUNT * 3);
  const sizes = new Float32Array(EMBER_COUNT);

  for (let i = 0; i < EMBER_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.35;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.05 + Math.random() * 0.1;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    const brightness = 0.5 + Math.random() * 0.5;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness * 0.3;
    colors[i * 3 + 2] = 0;

    sizes[i] = 0.03 + Math.random() * 0.04;
  }

  emberGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  emberGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  emberGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const emberMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  embers = new THREE.Points(emberGeometry, emberMaterial);
  group.add(embers);
}

function createSparks(group) {
  const sparkGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(SPARK_COUNT * 3);
  const velocities = new Float32Array(SPARK_COUNT * 3);

  for (let i = 0; i < SPARK_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 0.2;
    positions[i * 3 + 1] = 0.5 + Math.random() * 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

    velocities[i * 3] = (Math.random() - 0.5) * 0.02;
    velocities[i * 3 + 1] = 0.02 + Math.random() * 0.03;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
  }

  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  sparkGeometry.userData.velocities = velocities;

  const sparkMaterial = new THREE.PointsMaterial({
    color: 0xffaa00,
    size: 0.04,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  sparks = new THREE.Points(sparkGeometry, sparkMaterial);
  group.add(sparks);
}

function createFireLights(group) {
  fireLight = new THREE.PointLight(0xff6622, 3, 8, 1.5);
  fireLight.position.set(0, 0.5, 0);
  fireLight.castShadow = true;
  fireLight.shadow.mapSize.width = 512;
  fireLight.shadow.mapSize.height = 512;
  fireLight.shadow.camera.near = 0.1;
  fireLight.shadow.camera.far = 8;
  fireLight.shadow.bias = -0.002;
  group.add(fireLight);

  fireLightSecondary = new THREE.PointLight(0xff4400, 1.5, 5, 2);
  fireLightSecondary.position.set(0, 0.8, 0);
  group.add(fireLightSecondary);
}

/**
 * Updates campfire animation based on state.
 * @param {THREE.Group} group
 * @param {Object} state
 */
export function updateCampfire(group, state) {
  if (!group) return;

  time += 0.016;
  const intensity = state.fireActive ? state.firePower / 10 : 0;

  flames.forEach((flame, i) => {
    const material = flame.material;
    material.uniforms.time.value = time + flame.userData.phase;
    material.uniforms.intensity.value = intensity;

    if (state.fireActive) {
      const heightVariation = Math.sin(time * 5 + flame.userData.phase) * 0.1;
      flame.scale.y = 0.8 + intensity * 0.3 + heightVariation;
      flame.scale.x = flame.scale.z = 0.8 + intensity * 0.2;
      flame.visible = true;
    } else {
      flame.visible = false;
    }
  });

  if (embers) {
    const colors = embers.geometry.attributes.color;
    for (let i = 0; i < EMBER_COUNT; i++) {
      const flicker = 0.5 + Math.sin(time * 10 + i) * 0.3;
      const emberIntensity = state.fireActive ? flicker * intensity : flicker * 0.2;
      colors.array[i * 3] = emberIntensity;
      colors.array[i * 3 + 1] = emberIntensity * 0.3;
    }
    colors.needsUpdate = true;
    embers.visible = state.fireActive || intensity > 0.1;
  }

  if (sparks && state.fireActive) {
    const positions = sparks.geometry.attributes.position;
    const velocities = sparks.geometry.userData.velocities;

    for (let i = 0; i < SPARK_COUNT; i++) {
      positions.array[i * 3] += velocities[i * 3];
      positions.array[i * 3 + 1] += velocities[i * 3 + 1];
      positions.array[i * 3 + 2] += velocities[i * 3 + 2];

      if (positions.array[i * 3 + 1] > 2.5 || Math.random() < 0.02) {
        positions.array[i * 3] = (Math.random() - 0.5) * 0.2;
        positions.array[i * 3 + 1] = 0.5 + Math.random() * 0.3;
        positions.array[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      }
    }
    positions.needsUpdate = true;
    sparks.visible = true;
  } else if (sparks) {
    sparks.visible = false;
  }

  if (fireLight) {
    const flicker = 1 + Math.sin(time * 15) * 0.1 + Math.sin(time * 23) * 0.05;
    fireLight.intensity = state.fireActive ? 2 + intensity * 2 * flicker : 0;
    fireLight.distance = 5 + intensity * 4;
  }

  if (fireLightSecondary) {
    const flicker = 1 + Math.cos(time * 18) * 0.15;
    fireLightSecondary.intensity = state.fireActive ? 1 + intensity * flicker : 0;
  }
}

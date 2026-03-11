/**
 * @fileoverview Heat visualization for the 3D scene.
 * Creates animated heat ray particles, reflected rays, and warm zone indicators.
 */

import * as THREE from 'three';

const DIRECT_RAY_COUNT = 50;
const REFLECTED_RAY_COUNT = 30;

/** @type {THREE.Points} */
let directRays;
/** @type {THREE.Points} */
let reflectedRays;
/** @type {THREE.Mesh} */
let warmZone;
/** @type {THREE.Mesh} */
let fireGlow;
/** @type {Float32Array} */
let directVelocities;
/** @type {Float32Array} */
let reflectedVelocities;
/** @type {number} */
let time = 0;

/**
 * Creates the heat visualization group and adds it to the scene.
 * @param {THREE.Scene} scene
 * @returns {THREE.Group}
 */
export function createHeatVis(scene) {
  const group = new THREE.Group();
  group.name = 'heatvis';

  createDirectRays(group);
  createReflectedRays(group);
  createWarmZone(group);
  createFireGlow(group);

  scene.add(group);
  return group;
}

function createDirectRays(group) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(DIRECT_RAY_COUNT * 3);
  const colors = new Float32Array(DIRECT_RAY_COUNT * 3);
  const sizes = new Float32Array(DIRECT_RAY_COUNT);
  directVelocities = new Float32Array(DIRECT_RAY_COUNT * 3);

  for (let i = 0; i < DIRECT_RAY_COUNT; i++) {
    resetDirectParticle(i, positions, colors, sizes);

    const angle = (Math.random() - 0.5) * Math.PI * 0.6;
    const speed = 0.02 + Math.random() * 0.03;
    directVelocities[i * 3] = Math.cos(angle) * speed;
    directVelocities[i * 3 + 1] = Math.random() * 0.005;
    directVelocities[i * 3 + 2] = Math.sin(angle) * speed * 0.3;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  directRays = new THREE.Points(geometry, material);
  group.add(directRays);
}

function resetDirectParticle(i, positions, colors, sizes) {
  positions[i * 3] = (Math.random() - 0.5) * 0.3;
  positions[i * 3 + 1] = 0.3 + Math.random() * 0.5;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

  const heat = 0.7 + Math.random() * 0.3;
  colors[i * 3] = 1.0;
  colors[i * 3 + 1] = 0.3 + heat * 0.4;
  colors[i * 3 + 2] = heat * 0.1;

  sizes[i] = 0.04 + Math.random() * 0.06;
}

function createReflectedRays(group) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(REFLECTED_RAY_COUNT * 3);
  const colors = new Float32Array(REFLECTED_RAY_COUNT * 3);
  const sizes = new Float32Array(REFLECTED_RAY_COUNT);
  reflectedVelocities = new Float32Array(REFLECTED_RAY_COUNT * 3);

  for (let i = 0; i < REFLECTED_RAY_COUNT; i++) {
    resetReflectedParticle(i, positions, colors, sizes);

    const angle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.5;
    const speed = 0.015 + Math.random() * 0.02;
    reflectedVelocities[i * 3] = Math.cos(angle) * speed;
    reflectedVelocities[i * 3 + 1] = (Math.random() - 0.3) * 0.01;
    reflectedVelocities[i * 3 + 2] = Math.sin(angle) * speed * 0.5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  reflectedRays = new THREE.Points(geometry, material);
  group.add(reflectedRays);
}

function resetReflectedParticle(i, positions, colors, sizes) {
  positions[i * 3] = -2 + (Math.random() - 0.5) * 0.5;
  positions[i * 3 + 1] = 0.3 + Math.random() * 0.8;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

  colors[i * 3] = 1.0;
  colors[i * 3 + 1] = 0.6 + Math.random() * 0.3;
  colors[i * 3 + 2] = 0.2 + Math.random() * 0.2;

  sizes[i] = 0.03 + Math.random() * 0.04;
}

function createWarmZone(group) {
  const geometry = new THREE.SphereGeometry(2.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      intensity: { value: 0.5 },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        vPosition = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float intensity;
      uniform float time;
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        float dist = length(vPosition.xz);
        float falloff = 1.0 - smoothstep(0.0, 2.5, dist);
        
        float heightFade = 1.0 - smoothstep(0.0, 1.5, vPosition.y);
        
        float pulse = 0.9 + sin(time * 2.0 + dist * 2.0) * 0.1;
        
        float alpha = falloff * heightFade * intensity * pulse * 0.15;
        
        vec3 color = mix(
          vec3(1.0, 0.3, 0.0),
          vec3(1.0, 0.6, 0.2),
          falloff
        );
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  warmZone = new THREE.Mesh(geometry, material);
  warmZone.position.set(0, 0, 0);
  warmZone.rotation.x = 0;
  group.add(warmZone);
}

function createFireGlow(group) {
  const geometry = new THREE.PlaneGeometry(3, 3);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      intensity: { value: 1.0 },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float intensity;
      uniform float time;
      varying vec2 vUv;
      
      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center);
        
        float glow = exp(-dist * 3.0) * intensity;
        float flicker = 0.9 + sin(time * 8.0) * 0.1;
        
        vec3 color = vec3(1.0, 0.4, 0.1) * glow * flicker;
        float alpha = glow * 0.3;
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  fireGlow = new THREE.Mesh(geometry, material);
  fireGlow.rotation.x = -Math.PI / 2;
  fireGlow.position.set(0, 0.05, 0);
  group.add(fireGlow);
}

/**
 * Updates heat visualization based on state and object positions.
 * @param {THREE.Group} group
 * @param {Object} state
 * @param {THREE.Group} fireGroup
 * @param {THREE.Group} wallGroup
 * @param {THREE.Group} personGroup
 */
export function updateHeatVis(group, state, fireGroup, wallGroup, personGroup) {
  if (!group) return;

  time += 0.016;
  const intensity = state.fireActive ? state.firePower / 10 : 0;
  const showHeatmap = state.showHeatmap;

  const firePos = fireGroup ? fireGroup.position : new THREE.Vector3(0, 0, 0);
  const wallPos = wallGroup ? wallGroup.position : new THREE.Vector3(-2, 0, 0);
  const personPos = personGroup ? personGroup.position : new THREE.Vector3(2, 0, 0);

  group.position.copy(firePos);

  if (directRays) {
    updateDirectRays(state, firePos, personPos, intensity, showHeatmap);
  }

  if (reflectedRays) {
    updateReflectedRays(state, firePos, wallPos, personPos, intensity, showHeatmap);
  }

  if (warmZone) {
    warmZone.material.uniforms.intensity.value = showHeatmap ? intensity : 0;
    warmZone.material.uniforms.time.value = time;
    warmZone.visible = showHeatmap && intensity > 0.1;
  }

  if (fireGlow) {
    fireGlow.material.uniforms.intensity.value = intensity;
    fireGlow.material.uniforms.time.value = time;
    fireGlow.visible = state.fireActive;

    const scale = 1 + intensity * 0.5;
    fireGlow.scale.set(scale, scale, 1);
  }
}

function updateDirectRays(state, firePos, personPos, intensity, showHeatmap) {
  if (!state.fireActive || !showHeatmap) {
    directRays.visible = false;
    return;
  }

  directRays.visible = true;
  const positions = directRays.geometry.attributes.position;
  const colors = directRays.geometry.attributes.color;
  const sizes = directRays.geometry.attributes.size;

  const toPersonDir = new THREE.Vector3()
    .subVectors(personPos, firePos)
    .normalize();

  for (let i = 0; i < DIRECT_RAY_COUNT; i++) {
    positions.array[i * 3] += directVelocities[i * 3] * toPersonDir.x * 1.5;
    positions.array[i * 3 + 1] += directVelocities[i * 3 + 1];
    positions.array[i * 3 + 2] += directVelocities[i * 3 + 2];

    const dist = Math.sqrt(
      positions.array[i * 3] ** 2 +
      positions.array[i * 3 + 2] ** 2
    );

    if (dist > 5 || positions.array[i * 3 + 1] > 2 || positions.array[i * 3 + 1] < 0) {
      resetDirectParticle(i, positions.array, colors.array, sizes.array);
    }

    const fade = Math.max(0, 1 - dist / 5);
    colors.array[i * 3 + 1] = 0.3 + fade * 0.4;
  }

  positions.needsUpdate = true;
  colors.needsUpdate = true;

  directRays.material.opacity = 0.5 + intensity * 0.3;
}

function updateReflectedRays(state, firePos, wallPos, personPos, intensity, showHeatmap) {
  const wallTemp = state.wallTemperature;
  const ambientK = state.ambientTemp + 273.15;
  const tempDiff = wallTemp - ambientK;

  if (tempDiff < 10 || !showHeatmap) {
    reflectedRays.visible = false;
    return;
  }

  reflectedRays.visible = true;
  const positions = reflectedRays.geometry.attributes.position;
  const colors = reflectedRays.geometry.attributes.color;
  const sizes = reflectedRays.geometry.attributes.size;

  const wallOffset = new THREE.Vector3().subVectors(wallPos, firePos);
  const toPersonDir = new THREE.Vector3()
    .subVectors(personPos, wallPos)
    .normalize();

  const reflectIntensity = Math.min(1, tempDiff / 100);

  for (let i = 0; i < REFLECTED_RAY_COUNT; i++) {
    positions.array[i * 3] += reflectedVelocities[i * 3] * toPersonDir.x;
    positions.array[i * 3 + 1] += reflectedVelocities[i * 3 + 1];
    positions.array[i * 3 + 2] += reflectedVelocities[i * 3 + 2];

    const localX = positions.array[i * 3] - wallOffset.x;

    if (localX > 4 || positions.array[i * 3 + 1] > 2 || positions.array[i * 3 + 1] < 0) {
      positions.array[i * 3] = wallOffset.x + (Math.random() - 0.5) * 0.3;
      positions.array[i * 3 + 1] = 0.3 + Math.random() * 0.8;
      positions.array[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
  }

  positions.needsUpdate = true;

  reflectedRays.material.opacity = 0.3 + reflectIntensity * 0.4;
}

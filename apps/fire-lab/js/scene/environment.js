/**
 * @fileoverview Environment setup for the 3D campsite scene.
 * Creates ground plane, ambient lighting, moonlight, and night sky backdrop.
 */

import * as THREE from 'three';

/** @type {THREE.DirectionalLight} */
let moonLight;
/** @type {THREE.AmbientLight} */
let ambientLight;
/** @type {THREE.Mesh} */
let groundMesh;

/**
 * Creates the environment elements and adds them to the scene.
 * @param {THREE.Scene} scene
 */
export function createEnvironment(scene) {
  createSkybox(scene);
  createGround(scene);
  createLighting(scene);
  createTreeSilhouettes(scene);
}

function createSkybox(scene) {
  const skyGeometry = new THREE.SphereGeometry(50, 32, 32);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x0f1525) },
      bottomColor: { value: new THREE.Color(0x2a3548) },
      offset: { value: 10 },
      exponent: { value: 0.6 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide
  });

  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);

  addStars(scene);
}

function addStars(scene) {
  const starsGeometry = new THREE.BufferGeometry();
  const starCount = 500;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.5 + 0.5);
    const radius = 45;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8
  });

  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
}

function createGround(scene) {
  const groundGeometry = new THREE.PlaneGeometry(40, 40, 64, 64);

  const positions = groundGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.05 +
                  Math.random() * 0.02;
    positions.setZ(i, noise);
  }
  groundGeometry.computeVertexNormals();

  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2015,
    roughness: 0.95,
    metalness: 0.0,
    flatShading: false
  });

  groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  addGroundDetails(scene);
}

function addGroundDetails(scene) {
  const rockGeometry = new THREE.DodecahedronGeometry(0.15, 0);
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    roughness: 0.9,
    metalness: 0.1
  });

  for (let i = 0; i < 30; i++) {
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(
      (Math.random() - 0.5) * 15,
      0.05,
      (Math.random() - 0.5) * 15
    );
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    rock.scale.setScalar(0.5 + Math.random() * 1.5);
    rock.receiveShadow = true;
    rock.castShadow = true;
    scene.add(rock);
  }
}

function createLighting(scene) {
  ambientLight = new THREE.AmbientLight(0x4a5a7a, 0.6);
  scene.add(ambientLight);

  moonLight = new THREE.DirectionalLight(0x8899cc, 0.8);
  moonLight.position.set(10, 20, 5);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 1024;
  moonLight.shadow.mapSize.height = 1024;
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 50;
  moonLight.shadow.camera.left = -15;
  moonLight.shadow.camera.right = 15;
  moonLight.shadow.camera.top = 15;
  moonLight.shadow.camera.bottom = -15;
  moonLight.shadow.bias = -0.001;
  scene.add(moonLight);

  const hemisphereLight = new THREE.HemisphereLight(0x6688bb, 0x443322, 0.5);
  scene.add(hemisphereLight);
}

function createTreeSilhouettes(scene) {
  const treeMaterial = new THREE.MeshBasicMaterial({
    color: 0x050508,
    side: THREE.DoubleSide
  });

  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const radius = 12 + Math.random() * 5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const height = 4 + Math.random() * 4;
    const width = 1.5 + Math.random() * 1;

    const treeGeometry = new THREE.ConeGeometry(width, height, 4);
    const tree = new THREE.Mesh(treeGeometry, treeMaterial);
    tree.position.set(x, height / 2, z);
    tree.rotation.y = Math.random() * Math.PI;
    scene.add(tree);

    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6);
    const trunk = new THREE.Mesh(trunkGeometry, treeMaterial);
    trunk.position.set(x, 0.75, z);
    scene.add(trunk);
  }
}

/**
 * Updates environment based on simulation state.
 * @param {Object} state - Simulation state
 */
export function updateEnvironment(state) {
  if (ambientLight) {
    const tempFactor = Math.max(0, (state.ambientTemp + 20) / 55);
    ambientLight.intensity = 0.2 + tempFactor * 0.15;
  }
}

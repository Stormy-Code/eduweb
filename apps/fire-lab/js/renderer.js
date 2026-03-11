/**
 * @fileoverview Three.js WebGL renderer for Fire Lab 3D scene.
 * Manages scene setup, camera, controls, and render loop integration.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { state } from './state.js';
import { createEnvironment, updateEnvironment } from './scene/environment.js';
import { createCampfire, updateCampfire } from './scene/campfire.js';
import { createLogWall, updateLogWall } from './scene/logwall.js';
import { createShelter, updateShelter } from './scene/shelter.js';
import { createPerson, updatePerson } from './scene/person.js';
import { createHeatVis, updateHeatVis } from './scene/heatvis.js';

/** @type {THREE.WebGLRenderer} */
let renderer;
/** @type {THREE.Scene} */
let scene;
/** @type {THREE.PerspectiveCamera} */
let camera;
/** @type {OrbitControls} */
let controls;
/** @type {HTMLElement} */
let container;

/** @type {THREE.Group} */
let fireGroup;
/** @type {THREE.Group} */
let wallGroup;
/** @type {THREE.Group} */
let shelterGroup;
/** @type {THREE.Group} */
let personGroup;
/** @type {THREE.Group} */
let heatVisGroup;

/** @type {THREE.Raycaster} */
const raycaster = new THREE.Raycaster();
/** @type {THREE.Vector2} */
const mouse = new THREE.Vector2();
/** @type {THREE.Plane} */
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
/** @type {THREE.Vector3} */
const intersection = new THREE.Vector3();

/** @type {'fire'|'wall'|'person'|null} */
let selectedObject = null;
let isDragging = false;

/**
 * Initializes the 3D renderer and scene.
 * @param {HTMLElement} containerEl - Container element for the WebGL canvas
 */
export function initRenderer(containerEl) {
  container = containerEl;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x12182a);
  scene.fog = new THREE.Fog(0x12182a, 18, 45);

  const aspect = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
  camera.position.set(6, 4, 8);
  camera.lookAt(0, 0.5, -1);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 3;
  controls.maxDistance = 25;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.target.set(0, 0.5, -1);

  createSceneObjects();
  setupInteraction();

  window.addEventListener('resize', onWindowResize);
  onWindowResize();
}

function createSceneObjects() {
  createEnvironment(scene);

  fireGroup = createCampfire(scene);
  wallGroup = createLogWall(scene);
  shelterGroup = createShelter(scene);
  personGroup = createPerson(scene);
  heatVisGroup = createHeatVis(scene);

  syncPositionsFromState();
}

function syncPositionsFromState() {
  // Layout: Shelter (back) -> Fire (middle) -> Log Wall (front, reflects heat back)
  // Z axis: positive = toward camera, negative = away from camera
  // Shelter at Z=2 (back), Fire at Z=0 (middle), Wall at Z=-2 (front)
  
  if (shelterGroup) {
    shelterGroup.position.set(0, 0, 3);
  }
  if (personGroup) {
    personGroup.position.set(0, 0, 2.5);
  }
  if (fireGroup) {
    fireGroup.position.set(0, 0, 0);
  }
  if (wallGroup) {
    wallGroup.position.set(0, 0, -2.5);
  }
}

function syncPositionsToState() {
  // Convert 3D positions back to physics state (for heat calculations)
  if (fireGroup) {
    state.firePosition.x = 3 + fireGroup.position.z * 0.3;
    state.firePosition.y = fireGroup.position.x;
  }
  if (wallGroup) {
    state.wallPosition.x = 1.5 + wallGroup.position.z * 0.3;
    state.wallPosition.y = wallGroup.position.x;
  }
  if (personGroup) {
    state.personPosition.x = 5 + personGroup.position.z * 0.3;
    state.personPosition.y = personGroup.position.x;
  }
}

function setupInteraction() {
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
}

function onPointerDown(event) {
  updateMouse(event);
  raycaster.setFromCamera(mouse, camera);

  const selectables = [
    { group: fireGroup, name: 'fire' },
    { group: wallGroup, name: 'wall' },
    { group: personGroup, name: 'person' }
  ];

  for (const { group, name } of selectables) {
    if (!group) continue;
    const intersects = raycaster.intersectObjects(group.children, true);
    if (intersects.length > 0) {
      selectedObject = name;
      isDragging = true;
      controls.enabled = false;
      renderer.domElement.style.cursor = 'grabbing';
      return;
    }
  }
}

function onPointerMove(event) {
  updateMouse(event);

  if (isDragging && selectedObject) {
    raycaster.setFromCamera(mouse, camera);
    if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
      const x = Math.max(-4, Math.min(4, intersection.x));
      const z = Math.max(-5, Math.min(5, intersection.z));

      if (selectedObject === 'fire' && fireGroup) {
        fireGroup.position.x = x;
        fireGroup.position.z = Math.max(-2, Math.min(2.5, z));
      } else if (selectedObject === 'wall' && wallGroup) {
        wallGroup.position.x = x;
        wallGroup.position.z = Math.max(-5, Math.min(0, z));
      } else if (selectedObject === 'person') {
        if (personGroup) {
          personGroup.position.x = x;
          personGroup.position.z = Math.max(1, Math.min(5, z));
        }
        if (shelterGroup) {
          shelterGroup.position.x = x;
          shelterGroup.position.z = Math.max(1.5, Math.min(5.5, z + 0.5));
        }
      }

      syncPositionsToState();
    }
  } else {
    raycaster.setFromCamera(mouse, camera);
    const selectables = [fireGroup, wallGroup, personGroup].filter(Boolean);
    let hovering = false;

    for (const group of selectables) {
      const intersects = raycaster.intersectObjects(group.children, true);
      if (intersects.length > 0) {
        hovering = true;
        break;
      }
    }

    renderer.domElement.style.cursor = hovering ? 'grab' : 'default';
  }
}

function onPointerUp() {
  isDragging = false;
  selectedObject = null;
  controls.enabled = true;
  renderer.domElement.style.cursor = 'default';
}

function updateMouse(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onWindowResize() {
  if (!container || !camera || !renderer) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

/**
 * Renders the 3D scene. Called each frame.
 */
export function render() {
  if (!renderer || !scene || !camera) return;

  syncPositionsFromState();

  updateEnvironment(state);
  updateCampfire(fireGroup, state);
  updateLogWall(wallGroup, state);
  updateShelter(shelterGroup, state);
  updatePerson(personGroup, state);
  updateHeatVis(heatVisGroup, state, fireGroup, wallGroup, personGroup);

  controls.update();
  renderer.render(scene, camera);
}

/**
 * Gets the Three.js scene for external access.
 * @returns {THREE.Scene}
 */
export function getScene() {
  return scene;
}

/**
 * Gets the camera for external access.
 * @returns {THREE.PerspectiveCamera}
 */
export function getCamera() {
  return camera;
}

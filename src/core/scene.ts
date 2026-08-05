import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Fog to limit visibility and fade to black in the distance
  scene.fog = new THREE.FogExp2(0x000000, 0.05);

  return scene;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.8, 0); // 1.7m typical eye height
  return camera;
}

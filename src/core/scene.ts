import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Fog to limit visibility gently at far distance
  scene.fog = new THREE.FogExp2(0x000000, 0.00001);

  return scene;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.85, 0); // 1.85m, altura del personaje
  return camera;
}

import * as THREE from 'three';

export function setupLighting(scene: THREE.Scene) {
  // Main directional light for clean shadows and terminal contrast
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(20, 40, -20);
  dirLight.castShadow = true;

  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 120;

  // Cover the 60x60 map area cleanly
  const d = 35;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0005;

  scene.add(dirLight);

  // Subtle opposite fill light: soft monochrome fill so back-facing walls remain readable
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.85);
  fillLight.position.set(-20, 25, 20);
  fillLight.castShadow = false;
  scene.add(fillLight);

  // Balanced ambient light: subtle baseline illumination for ASCII character definition
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);
}


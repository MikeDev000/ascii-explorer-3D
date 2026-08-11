import * as THREE from 'three';

export function setupLighting(scene: THREE.Scene) {
  // Main directional light for harsh shadows and depth
  const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
  dirLight.position.set(20, 40, -20);
  dirLight.castShadow = true;

  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 100;

  // Expand shadow camera to cover the map area
  const d = 30;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.bias = -0.0005;

  scene.add(dirLight);

  // Ambient light for full field-of-view visibility
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  // Point lights for dramatic shadows and specular highlights
  const pointLight1 = new THREE.PointLight(0xffffff, 1.5, 10);
  pointLight1.position.set(10, 5, 10);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xffffff, 1.5, 10);
  pointLight2.position.set(-10, 5, -10);
  scene.add(pointLight2);

  const pointLight3 = new THREE.PointLight(0xffffff, 1.0, 15);
  pointLight3.position.set(0, 8, 15);
  scene.add(pointLight3);
}

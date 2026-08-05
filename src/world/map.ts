import * as THREE from 'three';

export function createMap(scene: THREE.Scene) {
  // Floor
  const floorGeo = new THREE.PlaneGeometry(50, 50);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Material for walls and structures
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x888888 });

  // Add perimeter walls
  const wallGeo = new THREE.BoxGeometry(50, 5, 1);
  
  const northWall = new THREE.Mesh(wallGeo, wallMat);
  northWall.position.set(0, 2.5, -25);
  northWall.receiveShadow = true;
  northWall.castShadow = true;
  scene.add(northWall);

  const southWall = new THREE.Mesh(wallGeo, wallMat);
  southWall.position.set(0, 2.5, 25);
  southWall.receiveShadow = true;
  southWall.castShadow = true;
  scene.add(southWall);

  const eastWall = new THREE.Mesh(wallGeo, wallMat);
  eastWall.position.set(25, 2.5, 0);
  eastWall.rotation.y = Math.PI / 2;
  eastWall.receiveShadow = true;
  eastWall.castShadow = true;
  scene.add(eastWall);

  const westWall = new THREE.Mesh(wallGeo, wallMat);
  westWall.position.set(-25, 2.5, 0);
  westWall.rotation.y = Math.PI / 2;
  westWall.receiveShadow = true;
  westWall.castShadow = true;
  scene.add(westWall);

  // Minimalist Labyrinth Structures (procedural)
  const columnGeo = new THREE.BoxGeometry(2, 4, 2);
  const blockGeo = new THREE.BoxGeometry(4, 2, 4);

  // Random columns
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(Math.random() * 40) - 20;
    const z = Math.floor(Math.random() * 40) - 20;
    
    // leave center empty for player spawn
    if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;

    const isColumn = Math.random() > 0.5;
    const mesh = new THREE.Mesh(isColumn ? columnGeo : blockGeo, wallMat);
    mesh.position.set(x, isColumn ? 2 : 1, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

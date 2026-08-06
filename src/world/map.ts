import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';

export function createMap(scene: THREE.Scene, world?: RAPIER.World) {
  // Floor
  const floorGeo = new THREE.PlaneGeometry(50, 50);
  const floorMat = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 10 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  if (world) {
    // Ground collider (50x50, thin box slightly below ground level)
    const floorBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0);
    const floorBody = world.createRigidBody(floorBodyDesc);
    const floorColliderDesc = RAPIER.ColliderDesc.cuboid(25, 0.1, 25);
    world.createCollider(floorColliderDesc, floorBody);
  }

  // Material for walls and structures
  const wallMat = new THREE.MeshPhongMaterial({ 
    color: 0xaaaaaa,
    shininess: 60,
    specular: 0x222222
  });

  // Perimeter walls helper
  const wallGeoNS = new THREE.BoxGeometry(50, 5, 1);
  const wallGeoEW = new THREE.BoxGeometry(1, 5, 50);

  const wallsData = [
    { pos: [0, 2.5, -25], geo: wallGeoNS, halfExtents: [25, 2.5, 0.5] },
    { pos: [0, 2.5, 25], geo: wallGeoNS, halfExtents: [25, 2.5, 0.5] },
    { pos: [25, 2.5, 0], geo: wallGeoEW, halfExtents: [0.5, 2.5, 25] },
    { pos: [-25, 2.5, 0], geo: wallGeoEW, halfExtents: [0.5, 2.5, 25] },
  ];

  wallsData.forEach(({ pos, geo, halfExtents }) => {
    const wallMesh = new THREE.Mesh(geo, wallMat);
    wallMesh.position.set(pos[0], pos[1], pos[2]);
    wallMesh.receiveShadow = true;
    wallMesh.castShadow = true;
    scene.add(wallMesh);

    if (world) {
      const wallBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos[0], pos[1], pos[2]);
      const wallBody = world.createRigidBody(wallBodyDesc);
      const wallColliderDesc = RAPIER.ColliderDesc.cuboid(halfExtents[0], halfExtents[1], halfExtents[2]);
      world.createCollider(wallColliderDesc, wallBody);
    }
  });

  // Minimalist Labyrinth Structures (procedural)
  const geometries = [
    new THREE.BoxGeometry(2, 4, 2),        // Index 0: Column Box
    new THREE.BoxGeometry(4, 2, 4),        // Index 1: Flat Box
    new THREE.SphereGeometry(2, 16, 16),    // Index 2: Sphere
    new THREE.TorusGeometry(1.5, 0.5, 16, 32), // Index 3: Torus
    new THREE.CylinderGeometry(1, 1, 4, 16) // Index 4: Cylinder
  ];

  // Random objects
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * 40) - 20;
    const z = Math.floor(Math.random() * 40) - 20;
    
    // leave center empty for player spawn
    if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;

    const geoIndex = Math.floor(Math.random() * geometries.length);
    const mesh = new THREE.Mesh(geometries[geoIndex], wallMat);
    
    // Adjust heights based on geometry type
    let yPos = 2;
    if (geoIndex === 1) yPos = 1; // Flat box
    if (geoIndex === 3) yPos = 1.5; // Torus

    mesh.position.set(x, yPos, z);
    
    if (geoIndex === 3) {
      mesh.rotation.x = Math.random() * Math.PI;
      mesh.rotation.y = Math.random() * Math.PI;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Create Rapier static collider matching geometry
    if (world) {
      const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, yPos, z);
      const rigidBody = world.createRigidBody(rigidBodyDesc);

      let colliderDesc: RAPIER.ColliderDesc;

      switch (geoIndex) {
        case 0: // Box 2x4x2
          colliderDesc = RAPIER.ColliderDesc.cuboid(1, 2, 1);
          break;
        case 1: // Flat Box 4x2x4
          colliderDesc = RAPIER.ColliderDesc.cuboid(2, 1, 2);
          break;
        case 2: // Sphere radius 2
          colliderDesc = RAPIER.ColliderDesc.ball(2.0);
          break;
        case 3: // Torus approximated by ball collider for simple collision
          colliderDesc = RAPIER.ColliderDesc.ball(1.8);
          break;
        case 4: // Cylinder radius 1, height 4
          colliderDesc = RAPIER.ColliderDesc.cylinder(2.0, 1.0);
          break;
        default:
          colliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 1);
      }

      world.createCollider(colliderDesc, rigidBody);
    }
  }
}

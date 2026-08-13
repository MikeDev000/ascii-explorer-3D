import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { HiddenMessage } from './HiddenMessage';

export function createMap(scene: THREE.Scene, world?: RAPIER.World) {
  // Procedural checkerboard texture for the floor to add detail in ASCII rendering
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#333333';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#666666';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillRect(256, 256, 256, 256);

  const floorTexture = new THREE.CanvasTexture(canvas);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(25, 25);
  floorTexture.magFilter = THREE.NearestFilter;

  // Floor
  const floorGeo = new THREE.PlaneGeometry(50, 50);
  const floorMat = new THREE.MeshPhongMaterial({ map: floorTexture, shininess: 10 });
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

  // Normal Cube (Visible normally)
  const cubeGeo = new THREE.BoxGeometry(3, 3, 3);
  const cubeMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 30 });
  const normalCube = new THREE.Mesh(cubeGeo, cubeMat);
  normalCube.position.set(0, 1.5, -8);
  normalCube.receiveShadow = true;
  normalCube.castShadow = true;
  scene.add(normalCube);

  if (world) {
    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1.5, -8);
    const rigidBody = world.createRigidBody(rigidBodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(1.5, 1.5, 1.5);
    world.createCollider(colliderDesc, rigidBody);
  }

  // Hidden Message Decal (Attached to the front face of the cube)
  const hiddenMessage = new HiddenMessage("HELLO\nWORLD", 2.5, 2.5);
  // Positioned slightly in front of the cube's front face (z = -8 + 1.5 + 0.01)
  hiddenMessage.position.set(1.51, 1.51, -8.0);
  hiddenMessage.rotation.y = Math.PI / 2;
  scene.add(hiddenMessage);
}
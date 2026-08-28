import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { HiddenMessage } from './HiddenMessage';

// --- Nivel Data-Driven ---
const levelData = {
  floor: { w: 50, d: 50 },
  walls: [
    { x: 0, y: 2.5, z: -25, w: 50, h: 5, d: 1 },
    { x: 0, y: 2.5, z: 25, w: 50, h: 5, d: 1 },
    { x: 25, y: 2.5, z: 0, w: 1, h: 5, d: 50 },
    { x: -25, y: 2.5, z: 0, w: 1, h: 5, d: 50 },
  ],
  staticCubes: [
    { x: 0, y: 1.5, z: -8, size: 3, hasMessage: true }
  ],
  dynamicSpheres: [
    { x: -6, y: 1.25, z: -8, radius: 1 }
  ]
};

// --- Factory Pattern ---
class EntityFactory {
  private scene: THREE.Scene;
  private world?: RAPIER.World;

  // Materiales cacheados
  private floorMat: THREE.Material;
  private wallMat: THREE.Material;
  private cubeMat: THREE.Material;
  private sphereMat: THREE.Material;

  public dynamicEntities: { mesh: THREE.Object3D, body: RAPIER.RigidBody }[] = [];
  private allMeshes: THREE.Mesh[] = [];
  private allBodies: RAPIER.RigidBody[] = [];

  constructor(scene: THREE.Scene, world?: RAPIER.World) {
    this.scene = scene;
    this.world = world;

    // Preparar textura del suelo procedural
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

    // Instanciar materiales una sola vez
    this.floorMat = new THREE.MeshPhongMaterial({ map: floorTexture, shininess: 10 });
    this.wallMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, shininess: 60, specular: 0x222222 });
    this.cubeMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 30 });
    this.sphereMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.2 });
  }

  public createFloor(width: number, depth: number) {
    const geo = new THREE.PlaneGeometry(width, depth);
    const mesh = new THREE.Mesh(geo, this.floorMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.allMeshes.push(mesh);

    if (this.world) {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0);
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, 0.1, depth / 2);
      this.world.createCollider(colliderDesc, body);
      this.allBodies.push(body);
    }
  }

  public createWall(x: number, y: number, z: number, w: number, h: number, d: number) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, this.wallMat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.allMeshes.push(mesh);

    if (this.world) {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2);
      this.world.createCollider(colliderDesc, body);
      this.allBodies.push(body);
    }
  }

  public createStaticCube(x: number, y: number, z: number, size: number, hasMessage: boolean = false) {
    const geo = new THREE.BoxGeometry(size, size, size);
    const mesh = new THREE.Mesh(geo, this.cubeMat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.allMeshes.push(mesh);

    if (hasMessage) {
      const msg = new HiddenMessage("HELLO\nWORLD", size * 0.83, size * 0.83);
      msg.position.set(0, 0, size / 2 + 0.01);
      mesh.add(msg);
    }

    if (this.world) {
      const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2);
      this.world.createCollider(colliderDesc, body);
      this.allBodies.push(body);
    }
  }

  public createDynamicSphere(x: number, y: number, z: number, radius: number) {
    const geo = new THREE.SphereGeometry(radius, 18, 16);
    const mesh = new THREE.Mesh(geo, this.sphereMat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.allMeshes.push(mesh);

    if (this.world) {
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setLinearDamping(0.3)
        .setAngularDamping(0.3);
      const body = this.world.createRigidBody(bodyDesc);

      const colliderDesc = RAPIER.ColliderDesc.ball(radius)
        .setFriction(0.4)
        .setRestitution(0.7); // Bouncy ball!
      this.world.createCollider(colliderDesc, body);

      body.wakeUp(); // Asegurar que inicie despierta y la gravedad actúe de inmediato

      this.dynamicEntities.push({ mesh, body });
      this.allBodies.push(body);
    }
  }

  public dispose() {
    this.floorMat.dispose();
    this.wallMat.dispose();
    this.cubeMat.dispose();
    this.sphereMat.dispose();

    for (const mesh of this.allMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }

    if (this.world) {
      for (const body of this.allBodies) {
        this.world.removeRigidBody(body);
      }
    }

    this.allMeshes = [];
    this.allBodies = [];
    this.dynamicEntities = [];
  }
}

// --- Construcción del Nivel ---
export function createMap(scene: THREE.Scene, world?: RAPIER.World) {
  const factory = new EntityFactory(scene, world);

  // Generar suelo
  factory.createFloor(levelData.floor.w, levelData.floor.d);

  // Generar muros
  levelData.walls.forEach(w => factory.createWall(w.x, w.y, w.z, w.w, w.h, w.d));

  // Generar cubos estáticos
  levelData.staticCubes.forEach(c => factory.createStaticCube(c.x, c.y, c.z, c.size, c.hasMessage));

  // Generar esferas dinámicas
  levelData.dynamicSpheres.forEach(s => factory.createDynamicSphere(s.x, s.y, s.z, s.radius));

  return {
    update: (_delta: number) => {
      // Sincronizar todas las entidades dinámicas
      factory.dynamicEntities.forEach(({ mesh, body }) => {
        const pos = body.translation();
        const rot = body.rotation();
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
      });
    },
    dispose: () => {
      factory.dispose();
    }
  };
}
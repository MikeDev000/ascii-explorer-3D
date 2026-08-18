import * as THREE from 'three';
import { useGameStore, type Collectible } from '../store/gameStore';

export class CollectiblesSystem {
  private activeItems: {
    data: Collectible;
    position: THREE.Vector3;
    element: HTMLElement;
    group: THREE.Group;
    coreMesh: THREE.Mesh;
    wireMesh: THREE.Mesh;
    light: THREE.PointLight;
  }[] = [];

  private scene: THREE.Scene;
  private container: HTMLElement;
  private camera: THREE.Camera;
  private playerBody: { translation: () => { x: number, y: number, z: number } } | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, playerBody: any) {
    this.scene = scene;
    this.camera = camera;
    this.playerBody = playerBody;
    this.container = document.getElementById('collectibles-container')!;

    // Spawn the 4 specific dev items right in front of the player (around z = -3)
    this.spawnItem({
      id: 'cap_1',
      type: 'cap',
      name: 'Cycle_Cap.o',
      ascii: '[~~~~]',
      corrupted: false
    }, new THREE.Vector3(2, 1, -3));

    this.spawnItem({
      id: 'ptr_1',
      type: 'pointer',
      name: 'Raw_Pointer.h',
      ascii: '{;::;>}',
      corrupted: false
    }, new THREE.Vector3(5, 1, -3));

    this.spawnItem({
      id: 'hex_normal_1',
      type: 'hex',
      name: 'Hex_Payload.bin',
      ascii: '0x',
      corrupted: false
    }, new THREE.Vector3(-1, 1, -3));

    // Corrupted version
    this.spawnItem({
      id: 'hex_corrupt_1',
      type: 'hex',
      name: 'Hex_Payload.bin',
      ascii: '0x?',
      corrupted: true
    }, new THREE.Vector3(-4, 1, -3));
  }

  private spawnItem(data: Collectible, position: THREE.Vector3) {
    // 1. Create Floating HUD Badge
    const el = document.createElement('div');
    el.className = 'collectible';
    if (data.corrupted) {
      el.classList.add('corrupt-blink');
    }
    el.innerHTML = `<span style="font-size: 10px; opacity: 0.8;">◆</span> ${data.ascii} <span style="font-size: 11px; opacity: 0.9;">${data.name}</span>`;
    this.container.appendChild(el);

    // 2. Create 3D Multi-Layered Object Group
    const group = new THREE.Group();
    group.position.copy(position);

    const mainColor = data.corrupted ? 0xff003c : 0x00ffff;
    const secondaryColor = data.corrupted ? 0xff0055 : 0xff00ff;

    // Solid inner core (creates dense ASCII characters @ # %)
    const coreGeo = new THREE.OctahedronGeometry(0.35, 0);
    const coreMat = new THREE.MeshPhongMaterial({
      color: mainColor,
      emissive: secondaryColor,
      emissiveIntensity: 0.6,
      shininess: 100
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Outer wireframe cage (creates thick structural border lines / ASCII geometry contour)
    const wireGeo = new THREE.IcosahedronGeometry(0.55, 0);
    const wireMat = new THREE.MeshPhongMaterial({
      color: secondaryColor,
      wireframe: true,
      wireframeLinewidth: 2,
      emissive: mainColor,
      emissiveIntensity: 0.3
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    group.add(wireMesh);

    // Point Light (casts a vibrant neon glow onto the ground and surrounding walls)
    const light = new THREE.PointLight(mainColor, 2.5, 5.0);
    light.position.set(0, 0, 0);
    group.add(light);

    this.scene.add(group);

    this.activeItems.push({
      data,
      position,
      element: el,
      group,
      coreMesh,
      wireMesh,
      light
    });
  }

  public update(delta: number = 0.016) {
    if (!this.playerBody) return;

    const pPos = this.playerBody.translation();
    const playerVec = new THREE.Vector3(pPos.x, pPos.y, pPos.z);

    // Update camera matrices for accurate projection
    this.camera.updateMatrixWorld();
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(projScreenMatrix);

    // Temp vector for projection
    const tempV = new THREE.Vector3();
    const now = performance.now() * 0.003;

    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const item = this.activeItems[i];

      // Distance check for collection (1.2 units for responsive pickup)
      if (playerVec.distanceTo(item.group.position) < 1.2) {
        // Collect it
        useGameStore.getState().addCollectible(item.data);
        item.element.remove();
        this.scene.remove(item.group);
        this.activeItems.splice(i, 1);
        continue;
      }

      // Animate the 3D multi-layered mesh (Counter-rotation + levitation)
      item.coreMesh.rotation.y += delta * 2.0;
      item.coreMesh.rotation.x += delta * 1.0;

      item.wireMesh.rotation.y -= delta * 1.2;
      item.wireMesh.rotation.z += delta * 1.5;

      // Levitation floating movement
      const floatOffsetY = Math.sin(now + i) * 0.12;
      item.group.position.y = item.position.y + floatOffsetY;

      // Light pulsing effect
      item.light.intensity = 2.0 + Math.sin(now * 2 + i) * 0.8;

      // Check if item is in camera view
      if (frustum.containsPoint(item.group.position)) {
        // 3D to 2D Screen Projection
        tempV.copy(item.group.position);
        tempV.project(this.camera);

        item.element.style.display = 'block';
        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(tempV.y * 0.5) + 0.5) * window.innerHeight;
        item.element.style.left = `${x}px`;
        item.element.style.top = `${y}px`;
      } else {
        item.element.style.display = 'none';
      }
    }
  }
}

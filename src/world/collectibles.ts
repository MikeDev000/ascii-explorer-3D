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
  private playerBody: { getPhysicsTranslation: () => { x: number, y: number, z: number } } | null = null;

  // Cached objects for math operations to prevent GC thrashing
  private _projScreenMatrix = new THREE.Matrix4();
  private _frustum = new THREE.Frustum();
  private _tempV = new THREE.Vector3();
  private _playerVec = new THREE.Vector3();

  constructor(scene: THREE.Scene, camera: THREE.Camera, playerBody: { getPhysicsTranslation: () => { x: number, y: number, z: number } }) {
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
      ascii: '{;:;}',
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
    // 1. Create Floating HUD Badge securely using DOM elements & textContent
    const el = document.createElement('div');
    el.className = 'collectible';
    if (data.corrupted) {
      el.classList.add('corrupt-blink');
    }

    const iconSpan = document.createElement('span');
    iconSpan.style.fontSize = '10px';
    iconSpan.style.opacity = '0.8';
    iconSpan.textContent = '◆';

    const nameSpan = document.createElement('span');
    nameSpan.style.fontSize = '11px';
    nameSpan.style.opacity = '0.9';
    nameSpan.textContent = data.name;

    el.appendChild(iconSpan);
    el.appendChild(document.createTextNode(` ${data.ascii} `));
    el.appendChild(nameSpan);

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

  private disposeItem(item: any) {
    if (item.coreMesh) {
      item.coreMesh.geometry.dispose();
      (item.coreMesh.material as THREE.Material).dispose();
    }
    if (item.wireMesh) {
      item.wireMesh.geometry.dispose();
      (item.wireMesh.material as THREE.Material).dispose();
    }
    if (item.light && typeof item.light.dispose === 'function') {
      item.light.dispose();
    }
  }

  public update(delta: number = 0.016) {
    if (!this.playerBody) return;

    const pPos = this.playerBody.getPhysicsTranslation();
    this._playerVec.set(pPos.x, pPos.y, pPos.z);

    // Update camera matrices for accurate projection
    this.camera.updateMatrixWorld();
    this._projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

    const now = performance.now() * 0.003;

    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const item = this.activeItems[i];

      // Distance check for collection (1.2 units for responsive pickup)
      if (this._playerVec.distanceTo(item.group.position) < 1.2) {
        // Collect it
        useGameStore.getState().addCollectible(item.data);
        item.element.remove();
        this.scene.remove(item.group);
        this.disposeItem(item);
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
      if (this._frustum.containsPoint(item.group.position)) {
        // 3D to 2D Screen Projection
        this._tempV.copy(item.group.position);
        this._tempV.project(this.camera);

        item.element.style.display = 'block';
        const x = (this._tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(this._tempV.y * 0.5) + 0.5) * window.innerHeight;
        item.element.style.left = `${x}px`;
        item.element.style.top = `${y}px`;
      } else {
        item.element.style.display = 'none';
      }
    }
  }
}

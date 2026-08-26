import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { useGameStore, type Collectible } from '../store/gameStore';
import type { PlayerController } from '../systems/player';

export class CollectiblesSystem {
  private activeItems: {
    data: Collectible;
    position: THREE.Vector3;
    group: THREE.Group;
    coreMesh: THREE.Mesh;
    wireMesh: THREE.Mesh;
    pointLight: THREE.PointLight;
  }[] = [];

  private scene: THREE.Scene;
  private container: HTMLElement;
  private camera: THREE.Camera;
  private player: PlayerController | null = null;
  private physicsWorld: RAPIER.World | null = null;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onResize: () => void;

  // Cached objects for math operations to prevent GC thrashing
  private _projScreenMatrix = new THREE.Matrix4();
  private _frustum = new THREE.Frustum();
  private _tempV = new THREE.Vector3();
  private _playerVec = new THREE.Vector3();
  private _ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
  private _rayDir = new THREE.Vector3();
  private _camPos = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    player: PlayerController,
    physicsWorld?: RAPIER.World
  ) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.physicsWorld = physicsWorld ?? null;
    this.container = document.getElementById('collectibles-container')!;

    // Setup Canvas Overlay
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '10';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.onResize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.ctx.font = 'bold 13px "JetBrains Mono", monospace';
    };
    window.addEventListener('resize', this.onResize);
    this.onResize(); // Initial sizing

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
    // 1. DOM Elements removed. Using Canvas Overlay instead.

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
      emissiveIntensity: 1.2,
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

    // Optimized PointLight to restore ground luminance efficiently (short range, no shadows)
    const pointLight = new THREE.PointLight(mainColor, 2.0, 4.5, 2);
    pointLight.castShadow = false;
    group.add(pointLight);

    this.scene.add(group);

    this.activeItems.push({
      data,
      position,
      group,
      coreMesh,
      wireMesh,
      pointLight
    });
  }

  public dispose() {
    // Cleanup for Lifecycle Manager (Fase 5 preparation)
    window.removeEventListener('resize', this.onResize);
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }

    // Dispose all active 3D items
    for (const item of this.activeItems) {
      this.scene.remove(item.group);
      this.disposeItem(item);
    }
    this.activeItems = [];
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
    if (item.pointLight) {
      item.pointLight.dispose();
    }
  }

  public update(delta: number = 0.016) {
    if (!this.player) return;

    const pPos = this.player.getPhysicsTranslation();
    this._playerVec.set(pPos.x, pPos.y, pPos.z);

    // Update camera matrices for accurate projection
    this._projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

    const now = performance.now() * 0.003;

    // Clear canvas every frame
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const item = this.activeItems[i];
      const distToPlayer = this._playerVec.distanceTo(item.group.position);

      // Distance check for collection (1.1 units for responsive pickup)
      if (distToPlayer < 1.1) {
        // Collect it
        useGameStore.getState().addCollectible(item.data);
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

      // Check if item is in camera view and within ~2m proximity
      if (distToPlayer <= 3.5 && this._frustum.containsPoint(item.group.position)) {
        let isOccluded = false;

        // Perform Line-of-Sight occlusion test using Rapier3D physics world
        if (this.physicsWorld) {
          this.camera.getWorldPosition(this._camPos);
          this._rayDir.subVectors(item.group.position, this._camPos);
          const totalDist = this._rayDir.length();

          if (totalDist > 0.6) {
            this._rayDir.normalize();

            // Offset ray start slightly in front of camera to clear player capsule
            const startOffset = 0.55;
            this._ray.origin.x = this._camPos.x + this._rayDir.x * startOffset;
            this._ray.origin.y = this._camPos.y + this._rayDir.y * startOffset;
            this._ray.origin.z = this._camPos.z + this._rayDir.z * startOffset;
            this._ray.dir.x = this._rayDir.x;
            this._ray.dir.y = this._rayDir.y;
            this._ray.dir.z = this._rayDir.z;

            const maxDist = totalDist - startOffset - 0.2;
            if (maxDist > 0) {
              const playerBody = this.player?.getRigidBody() ?? undefined;
              const hit = this.physicsWorld.castRay(
                this._ray,
                maxDist,
                true,
                undefined,
                undefined,
                undefined,
                playerBody
              );
              if (hit !== null) {
                isOccluded = true; // Obstacle (wall, cube, etc.) is in front!
              }
            }
          }
        }

        // Only draw badge if clear line of sight
        if (!isOccluded) {
          // 3D to 2D Screen Projection
          this._tempV.copy(item.group.position);
          this._tempV.project(this.camera);

          const x = (this._tempV.x * 0.5 + 0.5) * this.canvas.width;
          const y = (-(this._tempV.y * 0.5) + 0.5) * this.canvas.height;

          // Draw the compact badge on canvas
          const text = `${item.data.ascii} ${item.data.name}`;
          const metrics = this.ctx.measureText(text);
          const width = Math.ceil(metrics.width) + 10;
          const height = 24;

          const boxX = Math.round(x - width / 2);
          const boxY = Math.round(y - 80 - height / 2); // Floating neatly just above the object

          // Handle colors for corruption blinking
          let mainColor = '#00ffff';
          let strokeColor = '#ff00ff';
          let boxColor = 'rgba(12, 5, 24, 0.88)';

          if (item.data.corrupted) {
            if (Math.sin(performance.now() * 0.02) > 0) {
              mainColor = '#ff003c';
              strokeColor = '#ff003c';
              boxColor = 'rgba(30, 0, 10, 0.92)';
            }
          }

          this.ctx.fillStyle = boxColor;
          this.ctx.fillRect(boxX, boxY, width, height);
          this.ctx.strokeStyle = strokeColor;
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(boxX, boxY, width, height);

          this.ctx.fillStyle = mainColor;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(text, x, boxY + height / 2);
        }
      }
    }
  }
}

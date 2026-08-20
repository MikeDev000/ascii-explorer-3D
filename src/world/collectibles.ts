import * as THREE from 'three';
import { useGameStore, type Collectible } from '../store/gameStore';

export class CollectiblesSystem {
  private activeItems: {
    data: Collectible;
    position: THREE.Vector3;
    group: THREE.Group;
    coreMesh: THREE.Mesh;
    wireMesh: THREE.Mesh;
    light: THREE.PointLight;
  }[] = [];

  private scene: THREE.Scene;
  private container: HTMLElement;
  private camera: THREE.Camera;
  private playerBody: { getPhysicsTranslation: () => { x: number, y: number, z: number } } | null = null;
  
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onResize: () => void;

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
      group,
      coreMesh,
      wireMesh,
      light
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
    
    // Clear canvas every frame
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const item = this.activeItems[i];

      // Distance check for collection (1.2 units for responsive pickup)
      if (this._playerVec.distanceTo(item.group.position) < 1.2) {
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

      // Light pulsing effect
      item.light.intensity = 2.0 + Math.sin(now * 2 + i) * 0.8;

      // Check if item is in camera view
      if (this._frustum.containsPoint(item.group.position)) {
        // 3D to 2D Screen Projection
        this._tempV.copy(item.group.position);
        this._tempV.project(this.camera);

        const x = (this._tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(this._tempV.y * 0.5) + 0.5) * window.innerHeight;
        
        // Draw the badge on canvas
        this.ctx.font = 'bold 13px "JetBrains Mono", monospace';
        const text = `◆  ${item.data.ascii}  ${item.data.name}`;
        const metrics = this.ctx.measureText(text);
        const width = metrics.width + 16;
        const height = 24;
        
        const boxX = x - width / 2;
        const boxY = y - 100 - height / 2; // Float above the object
        
        // Handle colors for corruption blinking
        let mainColor = '#00ffff';
        let strokeColor = '#ff00ff';
        let boxColor = 'rgba(12, 5, 24, 0.85)';
        
        if (item.data.corrupted) {
          if (Math.sin(performance.now() * 0.02) > 0) {
            mainColor = '#ff003c';
            strokeColor = '#ff003c';
            boxColor = 'rgba(30, 0, 10, 0.9)';
          }
        }
        
        this.ctx.fillStyle = boxColor;
        this.ctx.fillRect(boxX, boxY, width, height);
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(boxX, boxY, width, height);
        
        this.ctx.fillStyle = mainColor;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x, boxY + height / 2 + 1); // +1 for visual baseline adjustment
      }
    }
  }
}

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { InputManager } from './input';
import RAPIER from '@dimforge/rapier3d';
import { useGameStore } from '../store/gameStore';

export class PlayerController {
  private controls: PointerLockControls;
  private input: InputManager;
  private rigidBody: RAPIER.RigidBody | null = null;
  private world: RAPIER.World | null = null;

  private baseSpeed = 4.0;
  private sprintMultiplier = 1.5;
  private jumpImpulse = 7;
  private isGrounded = false;

  private _frontDir = new THREE.Vector3();
  private _rightDir = new THREE.Vector3();
  private _moveDir = new THREE.Vector3();
  private _ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });

  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    input: InputManager,
    world?: RAPIER.World
  ) {
    this.controls = new PointerLockControls(camera, domElement);
    this.input = input;
    this.world = world ?? null;

    // Create Rapier physics body for player capsule
    if (this.world) {
      // Player capsule body (half height 0.5m, radius 0.4m -> total height 1.8m)
      const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 15.0, 0)
        .lockRotations(); // Keep capsule upright

      this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

      const colliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.4)
        .setFriction(0.2)
        .setRestitution(0.0);

      this.world.createCollider(colliderDesc, this.rigidBody);
      this.rigidBody.wakeUp(); // Asegurar que el cuerpo esté activo de inmediato al inicializar el juego
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.controls.object.position;
  }

  public lock() {
    try {
      const p = (this.controls as any).lock();
      if (p && typeof p.catch === 'function') {
        p.catch(() => { });
      }
    } catch (_) { }
  }

  public unlock() {
    try {
      this.controls.unlock();
    } catch (_) { }
  }

  public isLocked(): boolean {
    return this.controls.isLocked;
  }

  public onLock(cb: () => void) {
    this.controls.addEventListener('lock', cb);
  }

  public onUnlock(cb: () => void) {
    this.controls.addEventListener('unlock', cb);
  }

  public dispose() {
    this.controls.disconnect(); // Disconnects pointer lock events
    this.controls.dispose();
    if (this.rigidBody && this.world) {
      this.world.removeRigidBody(this.rigidBody);
    }
  }

  public getRigidBody(): RAPIER.RigidBody | null {
    return this.rigidBody;
  }

  public getPhysicsTranslation(): { x: number, y: number, z: number } {
    if (this.rigidBody) {
      return this.rigidBody.translation();
    }
    return {
      x: this.controls.object.position.x,
      y: this.controls.object.position.y,
      z: this.controls.object.position.z
    };
  }

  public update(_delta: number) {
    const isTerminalOpen = useGameStore.getState().isTerminalOpen;
    const canControl = this.controls.isLocked && !isTerminalOpen;

    if (this.rigidBody && this.world) {
      const linvel = this.rigidBody.linvel();

      // Check ground using a downward Raycast originating just below the capsule feet (center - 0.92m)
      const playerPos = this.rigidBody.translation();
      const rayOriginY = playerPos.y - 0.92;
      this._ray.origin.x = playerPos.x;
      this._ray.origin.y = rayOriginY;
      this._ray.origin.z = playerPos.z;
      this._ray.dir.x = 0;
      this._ray.dir.y = -1;
      this._ray.dir.z = 0;

      // Cast 0.15m downwards from feet
      const hit = this.world.castRay(this._ray, 0.15, true);

      // Player is grounded if ray hits a surface right below feet AND is not actively jumping upwards
      this.isGrounded = hit !== null && linvel.y <= 0.1;

      if (canControl) {
        const moveForward = this.input.isKeyDown('KeyW');
        const moveBackward = this.input.isKeyDown('KeyS');
        const moveLeft = this.input.isKeyDown('KeyA');
        const moveRight = this.input.isKeyDown('KeyD');
        const isSprinting = this.input.isKeyDown('ShiftLeft') || this.input.isKeyDown('ShiftRight');
        const wantJump = this.input.isKeyDown('Space');

        const currentSpeed = isSprinting ? this.baseSpeed * this.sprintMultiplier : this.baseSpeed;

        // Calculate camera orientation direction vectors
        this._frontDir.set(0, 0, 0);
        this.controls.getDirection(this._frontDir);
        this._frontDir.y = 0; // Flatten movement to XZ plane
        this._frontDir.normalize();

        // Vector pointing right relative to camera view
        this._rightDir.set(-this._frontDir.z, 0, this._frontDir.x);

        this._moveDir.set(0, 0, 0);
        if (moveForward) this._moveDir.add(this._frontDir);
        if (moveBackward) this._moveDir.sub(this._frontDir);
        if (moveRight) this._moveDir.add(this._rightDir);
        if (moveLeft) this._moveDir.sub(this._rightDir);

        if (this._moveDir.lengthSq() > 0) {
          this._moveDir.normalize();
        }

        // Apply horizontal physics velocity
        const targetVx = this._moveDir.x * currentSpeed;
        const targetVz = this._moveDir.z * currentSpeed;

        let targetVy = linvel.y;

        // Handle Jumping
        if (wantJump && this.isGrounded) {
          targetVy = this.jumpImpulse;
          this.isGrounded = false;
        }

        this.rigidBody.setLinvel({ x: targetVx, y: targetVy, z: targetVz }, true);
      }

      // ALWAYS sync camera position with physics body (eye height at top of capsule +0.7m)
      const newPos = this.rigidBody.translation();
      this.controls.object.position.set(newPos.x, newPos.y + 0.7, newPos.z);
    } else {
      if (canControl) {
        const moveForward = this.input.isKeyDown('KeyW');
        const moveBackward = this.input.isKeyDown('KeyS');
        const moveLeft = this.input.isKeyDown('KeyA');
        const moveRight = this.input.isKeyDown('KeyD');
        const isSprinting = this.input.isKeyDown('ShiftLeft') || this.input.isKeyDown('ShiftRight');
        const currentSpeed = isSprinting ? this.baseSpeed * this.sprintMultiplier : this.baseSpeed;
        const speed = currentSpeed * _delta;
        if (moveForward) this.controls.moveForward(speed);
        if (moveBackward) this.controls.moveForward(-speed);
        if (moveLeft) this.controls.moveRight(-speed);
        if (moveRight) this.controls.moveRight(speed);
      }
    }
  }
}

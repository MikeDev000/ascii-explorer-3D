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
  private lastUnlockTime = 0;
  private readonly cooldownMs = 150;

  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    input: InputManager,
    world?: RAPIER.World
  ) {
    this.controls = new PointerLockControls(camera, domElement);
    this.input = input;
    this.world = world ?? null;

    const instructions = document.getElementById('instructions');
    const hud = document.getElementById('hud');

    instructions?.addEventListener('click', () => {
      const elapsed = performance.now() - this.lastUnlockTime;
      const remaining = Math.max(0, this.cooldownMs - elapsed);

      setTimeout(() => {
        if (!this.controls.isLocked) {
          try {
            const p = (this.controls as any).lock();
            if (p && typeof p.catch === 'function') {
              p.catch(() => { });
            }
          } catch (_) { }
        }
      }, remaining);
    });

    this.controls.addEventListener('lock', () => {
      if (instructions) instructions.style.display = 'none';
      if (hud) hud.style.display = 'block';
    });

    this.controls.addEventListener('unlock', () => {
      this.lastUnlockTime = performance.now();
      const isTerminalOpen = useGameStore.getState().isTerminalOpen;

      if (!isTerminalOpen) {
        if (instructions) instructions.style.display = 'flex';
        if (hud) hud.style.display = 'none';
      }
    });

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
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.controls.object.position;
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
      const ray = new RAPIER.Ray(
        { x: playerPos.x, y: rayOriginY, z: playerPos.z },
        { x: 0, y: -1, z: 0 }
      );

      // Cast 0.15m downwards from feet
      const hit = this.world.castRay(ray, 0.15, true);

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
        const frontDir = new THREE.Vector3();
        this.controls.getDirection(frontDir);
        frontDir.y = 0; // Flatten movement to XZ plane
        frontDir.normalize();

        // Vector pointing right relative to camera view
        const rightDir = new THREE.Vector3(-frontDir.z, 0, frontDir.x);

        const moveDir = new THREE.Vector3();
        if (moveForward) moveDir.add(frontDir);
        if (moveBackward) moveDir.sub(frontDir);
        if (moveRight) moveDir.add(rightDir);
        if (moveLeft) moveDir.sub(rightDir);

        if (moveDir.lengthSq() > 0) {
          moveDir.normalize();
        }

        // Apply horizontal physics velocity
        const targetVx = moveDir.x * currentSpeed;
        const targetVz = moveDir.z * currentSpeed;

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

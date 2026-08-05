import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { InputManager } from './input';

export class PlayerController {
  private controls: PointerLockControls;
  private input: InputManager;
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  
  private baseSpeed = 40.0;
  private sprintMultiplier = 1.8;

  constructor(camera: THREE.Camera, domElement: HTMLElement, input: InputManager) {
    this.controls = new PointerLockControls(camera, domElement);
    this.input = input;

    const instructions = document.getElementById('instructions');
    const hud = document.getElementById('hud');

    instructions?.addEventListener('click', () => {
      this.controls.lock();
    });

    this.controls.addEventListener('lock', () => {
      if (instructions) instructions.style.display = 'none';
      if (hud) hud.style.display = 'block';
    });

    this.controls.addEventListener('unlock', () => {
      if (instructions) instructions.style.display = 'flex';
      if (hud) hud.style.display = 'none';
    });
  }

  public getPosition(): THREE.Vector3 {
    return this.controls.object.position;
  }

  public update(delta: number) {
    if (!this.controls.isLocked) return;

    // Apply friction
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    const moveForward = this.input.isKeyDown('KeyW');
    const moveBackward = this.input.isKeyDown('KeyS');
    const moveLeft = this.input.isKeyDown('KeyA');
    const moveRight = this.input.isKeyDown('KeyD');
    const isSprinting = this.input.isKeyDown('ShiftLeft') || this.input.isKeyDown('ShiftRight');

    this.direction.z = Number(moveForward) - Number(moveBackward);
    this.direction.x = Number(moveRight) - Number(moveLeft);
    this.direction.normalize();

    const speed = isSprinting ? this.baseSpeed * this.sprintMultiplier : this.baseSpeed;

    if (moveForward || moveBackward) this.velocity.z -= this.direction.z * speed * delta;
    if (moveLeft || moveRight) this.velocity.x -= this.direction.x * speed * delta;

    this.controls.moveRight(-this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta);
  }
}

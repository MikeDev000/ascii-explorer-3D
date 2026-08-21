import * as THREE from 'three';
import { InputManager } from './input';
import { useGameStore } from '../store/gameStore';

export const SharedUniforms = {
  uLampOn: { value: 0.0 }
};

export class LampSystem {
  private spotLight: THREE.SpotLight;
  private isOn: boolean = false;
  
  // k constant for quadratic drain: 100% drain in 17 seconds -> 100 / (17^2) ≈ 0.346
  private readonly drainK = 100 / (17 * 17);

  constructor(camera: THREE.Camera, input: InputManager) {
    // Green terminal color as requested
    this.spotLight = new THREE.SpotLight(0x00ff00, 10.0, 5.0, Math.PI / 5, 0.4, 1);
    this.spotLight.visible = this.isOn;
    this.spotLight.layers.enable(1); // Illuminates hidden objects on layer 1

    // Attach light to camera so it moves and rotates with the player's view
    camera.add(this.spotLight);

    this.spotLight.position.set(0, 0, 0);
    this.spotLight.target.position.set(0, 0, -1);
    camera.add(this.spotLight.target);

    input.on((event) => {
      if (event.repeat) return;
      if (event.key.toLowerCase() === 'f') {
        // Only toggle lamp during active gameplay (when pointer lock is active)
        if (document.pointerLockElement !== null) {
          const state = useGameStore.getState();
          if (state.battery > 0) {
            this.toggle();
          }
        }
      }
    });
  }

  public toggle() {
    this.isOn = !this.isOn;
    this.spotLight.visible = this.isOn;
    SharedUniforms.uLampOn.value = this.isOn ? 1.0 : 0.0;
  }

  public dispose(camera: THREE.Camera) {
    camera.remove(this.spotLight);
    camera.remove(this.spotLight.target);
    this.spotLight.dispose();
  }

  public update(delta: number) {
    const store = useGameStore.getState();
    let timeOn = store.lampTimeOn;
    
    if (this.isOn) {
      // Heat up (increase continuous usage time)
      timeOn += delta;
      
      // Calculate instantaneous drain rate (derivative of k * t^2 -> 2 * k * t)
      const drainRate = 2 * this.drainK * timeOn;
      
      // Drain battery
      const newBattery = Math.max(0, store.battery - drainRate * delta);
      store.setBattery(newBattery);
      store.setLampTimeOn(timeOn);
      
      // Auto-turn off if empty
      if (newBattery <= 0) {
        this.toggle();
      }
    } else {
      // Cool down twice as fast when off
      timeOn = Math.max(0, timeOn - delta * 2);
      store.setLampTimeOn(timeOn);
    }
  }
}

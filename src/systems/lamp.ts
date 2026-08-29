import * as THREE from 'three';
import { InputManager } from './input';
import { useGameStore } from '../store/gameStore';

export const SharedUniforms = {
  uLampOn: { value: 0.0 }
};

export class LampSystem {
  public static instance: LampSystem | null = null;
  private spotLight: THREE.SpotLight;
  private isOn: boolean = false;
  private _timeOn = 0;

  // k constant for quadratic drain: 100% drain in 17 seconds -> 100 / (17^2) ≈ 0.346
  private readonly drainK = 100 / (17 * 17);

  constructor(camera: THREE.Camera, input: InputManager) {
    LampSystem.instance = this;
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

  public setTimeOn(time: number) {
    this._timeOn = time;
  }

  public static setTimeOn(time: number) {
    if (LampSystem.instance) {
      LampSystem.instance.setTimeOn(time);
    }
  }

  public setLightState(enabled: boolean) {
    this.spotLight.visible = enabled;
    SharedUniforms.uLampOn.value = enabled ? 1.0 : 0.0;
  }

  public getIsOn(): boolean {
    return this.isOn;
  }

  public dispose(camera: THREE.Camera) {
    if (LampSystem.instance === this) {
      LampSystem.instance = null;
    }
    camera.remove(this.spotLight);
    camera.remove(this.spotLight.target);
    this.spotLight.dispose();
    this._timeOn = 0;
  }

  public update(delta: number) {
    const store = useGameStore.getState();

    if (this.isOn) {
      // Heat up (increase continuous usage time)
      this._timeOn += delta;

      let multiplier = 1.0;
      if (store.isBatteryUnstable) {
        multiplier = 2.5;
        
        // Flicker effect: lamp flickers every ~4.5 seconds
        const timeMs = performance.now();
        const cycle = timeMs % 4500;
        // Flicker in a small window (e.g. 0-100ms and 150-200ms)
        if (cycle < 100 || (cycle > 150 && cycle < 200)) {
          this.spotLight.intensity = Math.random() * 2.0; // Dim significantly
          SharedUniforms.uLampOn.value = 0.4 + Math.random() * 0.3; // Dim in shader
        } else {
          this.spotLight.intensity = 10.0;
          SharedUniforms.uLampOn.value = 1.0;
        }
      } else {
        this.spotLight.intensity = 10.0;
        SharedUniforms.uLampOn.value = 1.0;
      }

      // Calculate instantaneous drain rate (derivative of k * t^2 -> 2 * k * t)
      const drainRate = 2 * this.drainK * this._timeOn * multiplier;

      // Drain battery
      const newBattery = Math.max(0, store.battery - drainRate * delta);
      store.setBattery(newBattery);

      // Auto-turn off if empty
      if (newBattery <= 0) {
        this.toggle();
      }
    } else {
      // Cool down twice as fast when off
      this._timeOn = Math.max(0, this._timeOn - delta * 2);
    }
  }
}

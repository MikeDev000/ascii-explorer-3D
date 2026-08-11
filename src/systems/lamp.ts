import * as THREE from 'three';
import { InputManager } from './input';

export class LampSystem {
  private spotLight: THREE.SpotLight;
  private isOn: boolean = false;

  constructor(camera: THREE.Camera, input: InputManager) {
    // Green terminal color as requested
    this.spotLight = new THREE.SpotLight(0x00ff00, 25.0, 5.0, Math.PI / 5, 0.4, 1);
    this.spotLight.visible = this.isOn;

    // Attach light to camera so it moves and rotates with the player's view
    camera.add(this.spotLight);

    this.spotLight.position.set(0, 0, 0);
    this.spotLight.target.position.set(0, 0, -1);
    camera.add(this.spotLight.target);

    input.on((event) => {
      if (event.repeat) return;
      if (event.key.toLowerCase() === 'f') {
        this.toggle();
      }
    });
  }

  public toggle() {
    this.isOn = !this.isOn;
    this.spotLight.visible = this.isOn;
    // console.log("Lamp toggled:", this.isOn);
  }

  public update(_delta: number) {
    // Future battery drain logic here
  }
}

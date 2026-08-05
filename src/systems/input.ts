export class InputManager {
  private keys: Map<string, boolean> = new Map();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onKeyDown(event: KeyboardEvent) {
    this.keys.set(event.code, true);
  }

  private onKeyUp(event: KeyboardEvent) {
    this.keys.set(event.code, false);
  }

  public isKeyDown(code: string): boolean {
    return this.keys.get(code) ?? false;
  }
}

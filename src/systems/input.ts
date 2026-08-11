type KeyDownListener = (event: KeyboardEvent) => void;

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private listeners: KeyDownListener[] = [];

  constructor() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  public on(listener: KeyDownListener) {
    this.listeners.push(listener);
  }

  private onKeyDown(event: KeyboardEvent) {
    this.keys.set(event.code, true);
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    this.keys.set(event.code, false);
  }

  public isKeyDown(code: string): boolean {
    return this.keys.get(code) ?? false;
  }
}

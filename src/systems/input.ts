type KeyDownListener = (event: KeyboardEvent) => void;

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private listeners: KeyDownListener[] = [];
  
  private boundOnKeyDown: (event: KeyboardEvent) => void;
  private boundOnKeyUp: (event: KeyboardEvent) => void;

  constructor() {
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnKeyUp = this.onKeyUp.bind(this);
    
    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('keyup', this.boundOnKeyUp);
  }

  public dispose() {
    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('keyup', this.boundOnKeyUp);
    this.listeners = [];
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

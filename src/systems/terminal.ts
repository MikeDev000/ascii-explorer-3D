import { InputManager } from './input';
import { useGameStore } from '../store/gameStore';

export class TerminalSystem {
  private container: HTMLElement;
  private output: HTMLElement;
  private inputField: HTMLInputElement;
  private isOpen: boolean = false;

  constructor(inputManager: InputManager) {
    this.container = document.getElementById('terminal')!;
    this.output = document.getElementById('terminal-output')!;
    this.inputField = document.getElementById('terminal-input') as HTMLInputElement;

    // Listen on inputManager for '|' and 'Escape' when inputField might not have focus
    inputManager.on((event) => {
      if (event.key === '|') {
        event.preventDefault();
        this.toggle();
      } else if (event.key === 'Escape' && this.isOpen) {
        event.preventDefault();
        this.close();
      }
    });

    // Listen on inputField keydown specifically to catch '|' or 'Escape' before stopPropagation
    this.inputField.addEventListener('keydown', (e) => {
      if (e.key === '|') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
        return;
      }

      if (e.key === 'Enter') {
        const cmd = this.inputField.value.trim();
        if (cmd) {
          this.executeCommand(cmd);
          this.inputField.value = '';
        }
      }

      // Stop propagation so movement keys (WASD) don't move player while typing in terminal
      e.stopPropagation();
    });

    // Close terminal when clicking anywhere outside the terminal window in the game
    window.addEventListener('mousedown', (e) => {
      if (this.isOpen && !this.container.contains(e.target as Node)) {
        this.close();
      }
    });
  }

  public open() {
    if (this.isOpen) return;
    this.isOpen = true;
    useGameStore.getState().setTerminalOpen(true);
    this.container.style.display = 'flex';
    document.exitPointerLock();
    setTimeout(() => this.inputField.focus(), 50);
  }

  public close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    useGameStore.getState().setTerminalOpen(false);
    this.container.style.display = 'none';
    this.inputField.blur();

    try {
      const p = document.body.requestPointerLock() as any;
      if (p && typeof p.catch === 'function') {
        p.catch(() => { });
      }
    } catch (_) { }
  }

  public toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private print(text: string, isCommand: boolean = false) {
    const line = document.createElement('div');
    line.textContent = isCommand ? `> ${text}` : text;
    this.output.appendChild(line);
    this.output.scrollTop = this.output.scrollHeight;
  }

  private executeCommand(cmd: string) {
    this.print(cmd, true);

    const args = cmd.split(' ').filter(Boolean);
    const command = args[0].toLowerCase();

    switch (command) {
      case 'hello':
        this.print('Hello world :)');
        break;
      default:
        this.print(`Command not found: ${command}`);
        break;
    }
  }
}

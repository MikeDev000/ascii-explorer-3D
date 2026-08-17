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
        if (this.isOpen) {
          this.close();
        } else if (document.pointerLockElement !== null) {
          // Only allow opening terminal from active gameplay, not when game is paused
          this.open();
        }
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

    // Small 200ms debounce buffer to satisfy Chrome/Firefox rate limit after exiting lock
    setTimeout(() => {
      if (!this.isOpen && !document.pointerLockElement) {
        try {
          const p = document.body.requestPointerLock() as any;
          if (p && typeof p.catch === 'function') {
            p.catch(() => {
              const isTerminalOpen = useGameStore.getState().isTerminalOpen;
              if (!isTerminalOpen && !document.pointerLockElement) {
                const instructions = document.getElementById('instructions');
                const hud = document.getElementById('hud');
                if (instructions) instructions.style.display = 'flex';
                if (hud) hud.style.display = 'none';
              }
            });
          }
        } catch (_) { }
      }
    }, 200);
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
    if (args.length === 0) return;

    const command = args[0].toLowerCase();
    const fullCmd = args.join(' ').toLowerCase();
    const store = useGameStore.getState();

    if (fullCmd === 'ls /inventory/' || command === 'ls') {
      const inv = store.inventory;
      if (inv.length === 0) {
        this.print('Inventory is empty.');
      } else {
        inv.forEach(item => {
          this.print(`${item.ascii} ${item.name} ${item.corrupted ? '(CORRUPTED)' : ''}`);
        });
      }
      return;
    }

    if (fullCmd === 'sanitize 0x -fix') {
      const success = store.sanitizeCollectible('hex');
      if (success) {
        this.print('SUCCESS: Hex_Payload.bin has been sanitized and patched.');
      } else {
        this.print('ERROR: No corrupted Hex_Payload.bin found in inventory.');
      }
      return;
    }

    if (['build cell', 'make bat0', 'compile buffer'].includes(fullCmd)) {
      const inv = store.inventory;
      const hasCap = inv.some(i => i.type === 'cap');
      const hasPtr = inv.some(i => i.type === 'pointer');
      const hasHex = inv.some(i => i.type === 'hex');

      if (hasCap && hasPtr && hasHex) {
        // Check corruption
        const isCorrupted = inv.find(i => i.type === 'hex')?.corrupted;

        // Remove items
        const toRemove = [
          inv.find(i => i.type === 'cap')!.id,
          inv.find(i => i.type === 'pointer')!.id,
          inv.find(i => i.type === 'hex')!.id,
        ];
        store.removeCollectibles(toRemove);

        // Recharge standard
        window.dispatchEvent(new CustomEvent('lamp-recharge', { detail: { percent: 100, penalty: 0 } }));
        this.print('SUCCESS: Battery Cell compiled. Buffer restored to 100%.');

        if (isCorrupted) {
          this.print('WARNING: Corrupted Hex_Payload used. System instability detected!');
          store.setTriggerGlitch(true);
        }
      } else {
        this.print('ERROR: Insufficient components. Requires: Cycle_Cap.o, Raw_Pointer.h, Hex_Payload.bin.');
      }
      return;
    }

    if (['make battery --unsafebuild', 'build cell -u'].includes(fullCmd)) {
      const inv = store.inventory;
      if (inv.length >= 2) {
        const toRemove = [inv[0].id, inv[1].id];
        store.removeCollectibles(toRemove);

        // Recharge unsafe
        window.dispatchEvent(new CustomEvent('lamp-recharge', { detail: { percent: 40, penalty: 10 } }));
        this.print('WARNING: Unsafe build forced. Battery restored to 40%. Severe wear penalty applied.');
      } else {
        this.print('ERROR: Requires at least 2 components for emergency patch.');
      }
      return;
    }

    switch (command) {
      case 'hello':
        this.print('Hello world :)');
        break;
      case 'help':
        this.print('Commands:');
        this.print('  hello - Says hello');
        this.print('  help - Shows this message');
        this.print('  cat [objeto] - Lee el contenido o el estado de un objeto');
        this.print('  set [variable] = [valor] - Cambia el valor de una propiedad del mapa o jugador. Ej: gravity');
        this.print('  chmod [permiso] [objeto] - Cambia las propiedades de acceso de un muro o puerta');
        this.print('  free - Libera la memoria cercana, destruye obstaculos menores alrededor');
        this.print('  kill -9 <proceso> - Elimina un proceso/entidad/obstaculo de código corrupto');
        this.print('  ls /inventory/ - Lists collected components');
        this.print('  sanitize 0x -fix - Cleans corrupted Hex_Payload');
        this.print('  build cell - Crafts 100% battery (Requires 3 items)');
        this.print('  cell -u - Emergency craft 40% battery (Requires 2 items)');
        break;
      case 'resetbattery':
        useGameStore.getState().setBattery(100);
        this.print('Battery reset to 100%');
        break;
      default:
        this.print(`Command not found: ${command}`);
        break;
    }
  }
}

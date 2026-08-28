import { InputManager } from './input';
import { useGameStore } from '../store/gameStore';
import { CraftingService } from '../services/CraftingService';
import { WorldQueryService } from '../services/WorldQueryService';

export class TerminalSystem {
  private container: HTMLElement;
  private scrollBody: HTMLElement;
  private output: HTMLElement;
  private inputField: HTMLInputElement;
  private isOpen: boolean = false;

  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnKeyDown: (e: KeyboardEvent) => void;

  private readonly COMMANDS: string[] = [
    'ls', 'ls /inventory/', 'sanitize -f', 
    'build cell', 'make bat0', 'compile buffer',
    'cell -u', 'build cell -u', 'make bat0 --unsafebuild',
    'hello', 'help', 'resetbattery', 'clear', 'cls',
    'cat', 'set', 'chmod', 'free', 'kill'
  ];

  private history: string[] = [];
  private historyIndex: number = -1;
  private draftInput: string = '';
  private lastTabInput: string = '';

  constructor(inputManager: InputManager) {
    this.container = document.getElementById('terminal')!;
    this.scrollBody = document.getElementById('terminal-body') || this.container;
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
    this.boundOnKeyDown = (e: KeyboardEvent) => {
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

      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        
        const cmd = this.inputField.value;
        if (cmd) {
          const matches = this.COMMANDS.filter(c => c.startsWith(cmd.toLowerCase()));
          
          if (matches.length === 1) {
            this.inputField.value = matches[0];
            this.lastTabInput = '';
          } else if (matches.length > 1) {
            let commonPrefix = matches[0];
            for (let i = 1; i < matches.length; i++) {
              let j = 0;
              while (j < commonPrefix.length && j < matches[i].length && commonPrefix[j] === matches[i][j]) {
                j++;
              }
              commonPrefix = commonPrefix.substring(0, j);
            }
            
            if (commonPrefix.length > cmd.length) {
              this.inputField.value = commonPrefix;
              this.lastTabInput = '';
            } else if (this.lastTabInput !== cmd) {
              this.print(`Suggestions: ${matches.join(', ')}`);
              this.lastTabInput = cmd;
            }
          }
        }
        return;
      }

      // Reset last tab input if any other key is pressed
      if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt') {
        this.lastTabInput = '';
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.history.length === 0) return;
        
        if (this.historyIndex === -1) {
          this.draftInput = this.inputField.value;
        }
        
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.inputField.value = this.history[this.historyIndex];
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.historyIndex >= 0) {
          this.historyIndex--;
          if (this.historyIndex === -1) {
            this.inputField.value = this.draftInput;
          } else {
            this.inputField.value = this.history[this.historyIndex];
          }
        }
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
    };
    this.inputField.addEventListener('keydown', this.boundOnKeyDown);

    // Close terminal when clicking anywhere outside the terminal window in the game
    this.boundOnMouseDown = (e: MouseEvent) => {
      if (this.isOpen && !this.container.contains(e.target as Node)) {
        this.close();
      }
    };
    window.addEventListener('mousedown', this.boundOnMouseDown);
  }

  public dispose() {
    this.close();
    this.inputField.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('mousedown', this.boundOnMouseDown);
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
    line.textContent = isCommand ? `> ${text}` : `\t${text}`;
    this.output.appendChild(line);
    this.scrollBody.scrollTop = this.scrollBody.scrollHeight;
  }

  private executeCommand(cmd: string) {
    this.print(cmd, true);

    const args = cmd.split(' ').filter(Boolean);
    if (args.length === 0) return;

    this.history.unshift(cmd);
    if (this.history.length > 10) {
      this.history.pop();
    }
    this.historyIndex = -1;

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

    if (fullCmd === 'sanitize -f') {
      const success = store.sanitizeCollectible('hex');
      if (success) {
        this.print('SUCCESS: Hex_Payload.bin has been sanitized and patched.');
      } else {
        this.print('ERROR: No corrupted Hex_Payload.bin found in inventory.');
      }
      return;
    }

    if (['build cell', 'make bat0', 'compile buffer'].includes(fullCmd)) {
      const result = CraftingService.craftBatteryCell();
      this.print(result.message);
      if (result.warning) {
        this.print(result.warning);
      }
      return;
    }

    if (['make bat0 --unsafebuild', 'build cell -u', 'cell -u'].includes(fullCmd)) {
      const result = CraftingService.craftUnsafeBattery();
      this.print(result.message);
      if (result.warning) {
        this.print(result.warning);
      }
      return;
    }

    switch (command) {
      case 'hello':
        this.print('Hello world :)');
        break;
      case 'help':
        this.print('Commands:');
        this.print('hello - Says hello');
        this.print('help - Shows this message');
        this.print('cat [objeto] - Lee el contenido o el estado de un objeto');
        this.print('set [variable] = [valor] - Cambia el valor de una propiedad del mapa o jugador. Ej: gravity');
        this.print('chmod [permiso] [objeto] - Cambia las propiedades de acceso de un muro o puerta');
        this.print('free - Libera la memoria cercana, destruye obstaculos menores alrededor');
        this.print('kill <proceso> - Elimina un proceso/entidad/obstaculo de código corrupto');
        this.print('ls /inventory/ - Lists collected components');
        this.print('sanitize -f - Cleans corrupted Hex_Payload');
        this.print('build cell - Crafts 100% battery (Requires 3 items)');
        this.print('cell -u - Emergency craft 40% battery (Requires 2 items)');
        break;
      case 'cat': {
        if (args.length < 2) {
          this.print('Usage: cat [objeto]');
        } else {
          const target = args[1].toLowerCase();
          const inv = store.inventory;
          const item = inv.find(i => i.name.toLowerCase() === target || i.type.toLowerCase() === target);
          if (item) {
            this.print(`--- ${item.name} ---`);
            this.print(`Type: ${item.type}`);
            this.print(`Status: ${item.corrupted ? 'CORRUPTED' : 'OK'}`);
            this.print(`Data: ${item.ascii}`);
          } else {
            this.print(`cat: ${args[1]}: No such file or object in inventory`);
          }
        }
        break;
      }
      case 'set': {
        if (args.length < 4 || args[2] !== '=') {
          this.print('Usage: set [variable] = [valor]');
        } else {
          const variable = args[1];
          const valor = args[3];
          this.print(`set: property '${variable}' updated to '${valor}'`);
        }
        break;
      }
      case 'chmod': {
        if (args.length < 3) {
          this.print('Usage: chmod [permiso] [objeto]');
        } else {
          const permission = args[1];
          const target = args[2];
          const result = WorldQueryService.chmod(permission, target);
          this.print(result.message);
          if (result.warning) this.print(result.warning);
        }
        break;
      }
      case 'free': {
        const freeResult = WorldQueryService.freeNearbyObstacles();
        this.print(freeResult.message);
        if (freeResult.warning) this.print(freeResult.warning);
        break;
      }
      case 'kill': {
        if (args.length < 2) {
          this.print('Usage: kill <proceso>');
        } else {
          const proc = args[1];
          const killResult = WorldQueryService.killProcess(proc);
          this.print(killResult.message);
          if (killResult.warning) this.print(killResult.warning);
        }
        break;
      }
      case 'resetbattery':
        useGameStore.getState().setBattery(100);
        this.print('Battery reset to 100%');
        break;
      case 'clear':
      case 'cls':
        this.output.innerHTML = '';
        break;
      default:
        this.print(`Command not found: ${command}`);
        break;
    }
  }
}

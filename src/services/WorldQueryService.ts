import { PlayerController } from '../systems/player';

import { PhysicsSystem } from '../physics/physics';

type VarHandler = {
  get: () => number | string;
  set: (val: number) => void;
  min?: number;
  max?: number;
  description: string;
};

export class WorldQueryService {
  private static variableRegistry: Record<string, VarHandler> = {
    gravity: {
      get: () => PhysicsSystem.instance?.getGravity() ?? 0,
      set: (val: number) => {
        const g = val > 0 ? -val : val; // Ensure gravity is negative (downwards) if meant to be normal
        PhysicsSystem.instance?.setGravity(g);
      },
      description: 'System gravity force (m/s²)'
    },
    jumpforce: {
      get: () => PlayerController.getJumpForce(),
      set: (val: number) => PlayerController.setJumpForce(val),
      min: 0,
      description: 'Player jump impulse force'
    }
    // Aliases
  };

  // Add aliases
  static {
    WorldQueryService.variableRegistry['g'] = WorldQueryService.variableRegistry['gravity'];
    WorldQueryService.variableRegistry['jump'] = WorldQueryService.variableRegistry['jumpforce'];
    WorldQueryService.variableRegistry['jump_force'] = WorldQueryService.variableRegistry['jumpforce'];
  }

  public static setVariable(variable: string, value: string): { success: boolean; message: string; warning?: string } {
    const varName = variable.toLowerCase().trim();
    const num = parseFloat(value);

    if (isNaN(num)) {
      return {
        success: false,
        message: `ERROR: '${value}' is not a valid numerical value.`
      };
    }

    const handler = this.variableRegistry[varName];

    if (!handler) {
      const available = Object.keys(this.variableRegistry)
        .filter(k => k !== 'g' && k !== 'jump' && k !== 'jump_force') // Hide aliases
        .join(', ');
      return {
        success: false,
        message: `set: unknown variable '${variable}'. Available: ${available}`
      };
    }

    if (handler.min !== undefined && num < handler.min) {
      return {
        success: false,
        message: `ERROR: ${varName} cannot be less than ${handler.min}.`
      };
    }
    
    if (handler.max !== undefined && num > handler.max) {
      return {
        success: false,
        message: `ERROR: ${varName} cannot be greater than ${handler.max}.`
      };
    }

    handler.set(num);
    const updatedValue = handler.get();

    return {
      success: true,
      message: `[✓] System property '${variable}' updated to ${updatedValue}`
    };
  }

  public static freeNearbyObstacles(_playerPosition?: { x: number, y: number, z: number }): { success: boolean; message: string; warning?: string } {
    // Placeholder implementation
    return {
      success: true,
      message: 'free: Memory chunks liberated. Minor obstacles destroyed.'
    };
  }

  public static killProcess(processName: string): { success: boolean; message: string; warning?: string } {
    // Placeholder implementation
    return {
      success: false,
      message: `kill: ${processName}: no such process`
    };
  }

  public static chmod(permission: string, target: string): { success: boolean; message: string; warning?: string } {
    // Placeholder implementation
    return {
      success: true,
      message: `chmod: [${target}] — access permissions updated to [${permission}]`
    };
  }
}

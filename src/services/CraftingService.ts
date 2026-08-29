import { useGameStore } from '../store/gameStore';
import { LampSystem } from '../systems/lamp';

export class CraftingService {
  public static craftBatteryCell(): { success: boolean; steps: string[]; warning?: string } {
    const store = useGameStore.getState();
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

      // Add PowerCell to inventory
      store.addCollectible({
        id: 'powercell_' + Date.now(),
        type: 'powercell',
        name: 'PowerCell.bin',
        ascii: '[*::*]',
        corrupted: isCorrupted || false
      });

      const steps = [
        '[ make bat0 ]',
        'CC src/components/Cycle_Cap.o',
        'CC src/components/Raw_Pointer.h',
        'LD src/components/Hex_Payload.bin',
        'Linking...',
        'SUCCESS: PowerCell.bin generated. Added to inventory.'
      ];

      if (isCorrupted) {
        return { 
          success: true, 
          steps,
          warning: 'WARNING: Corrupted Hex_Payload used. Module stability compromised!' 
        };
      }
      
      return { success: true, steps };
    } 
    
    return { success: false, steps: ['ERROR: Insufficient components. Requires: Cycle_Cap.o, Raw_Pointer.h, Hex_Payload.bin.'] };
  }

  public static installPowerCell(): { success: boolean; steps: string[]; isCorrupted?: boolean; warning?: string } {
    const store = useGameStore.getState();
    const inv = store.inventory;
    const powercell = inv.find(i => i.type === 'powercell');

    if (powercell) {
      const isCorrupted = powercell.corrupted;
      store.removeCollectibles([powercell.id]);

      const steps = [
        '[ insmod PowerCell.bin ]',
        'Mounting Daemon Module...',
        'Loading power reserves...',
        'SUCCESS: Battery cell mounted. Buffer restored to 100%.'
      ];

      if (isCorrupted) {
        return {
          success: true,
          steps,
          isCorrupted: true,
          warning: 'WARNING: System instability detected! Glitch injected into kernel.'
        };
      }

      return { success: true, steps, isCorrupted: false };
    }

    return { success: false, steps: ['ERROR: No PowerCell.bin found in inventory or mounted state.'] };
  }

  public static animateBatteryRecharge(targetBattery: number = 100, durationMs: number = 1500, onComplete?: () => void) {
    const store = useGameStore.getState();
    const startBattery = store.battery;
    const startTime = performance.now();
    LampSystem.setTimeOn(0);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1.0);
      
      // Smooth cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startBattery + (targetBattery - startBattery) * ease;
      store.setBattery(current);

      if (progress < 1.0) {
        requestAnimationFrame(step);
      } else {
        store.setBattery(targetBattery);
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(step);
  }

  public static craftUnsafeBattery(): { success: boolean; steps: string[]; warning?: string } {
    const store = useGameStore.getState();
    const inv = store.inventory;
    
    if (inv.length >= 2) {
      const toRemove = [inv[0].id, inv[1].id];
      store.removeCollectibles(toRemove);

      // Add unstable patch to inventory
      store.addCollectible({
        id: 'patch_' + Date.now(),
        type: 'patch',
        name: 'PowerCell_unstable.o',
        ascii: '[!?~]',
        corrupted: false,
        volatile: true
      });

      const steps = [
        '[!] WARNING: Missing required symbols. Enforcing dirty compilation...',
        '[!] Generating hotpatch with uninitialized memory offsets...',
        '[✓] Output object created: /inventory/PowerCell_unstable.o',
        "[i] Run './PowerCell_unstable.o' or 'load patch' to inject."
      ];

      return { success: true, steps };
    }
    
    return { success: false, steps: ['ERROR: Requires at least 2 components for emergency patch.'] };
  }

  public static installPatch(): { success: boolean; steps: string[]; warning?: string } {
    const store = useGameStore.getState();
    const inv = store.inventory;
    const patch = inv.find(i => i.type === 'patch');

    if (patch) {
      store.removeCollectibles([patch.id]);

      store.setBatteryUnstable(true);

      const steps = [
        '[*] Force-injecting patch into PID 4096 (Debugger_Lamp)...',
        '[!] WARNING: Memory alignment failure. Buffer capacity capped at 40%.',
        '[!] WARNING: High thermal dissipation detected. Drain rate multiplier = 2.5x.',
        '[✓] Core power set to 40%.'
      ];

      return { success: true, steps };
    }

    return { success: false, steps: ['ERROR: No PowerCell_unstable.o found in inventory or already injected.'] };
  }
}

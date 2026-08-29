import { useGameStore } from '../store/gameStore';
import { LampSystem } from '../systems/lamp';

export class CraftingService {
  public static craftBatteryCell(): { success: boolean; steps: string[]; warning?: string } {
    const store = useGameStore.getState();
    const inv = store.inventory;
    const cap = inv.find(i => i.type === 'cap');
    const ptr = inv.find(i => i.type === 'pointer');
    const hex = inv.find(i => i.type === 'hex');

    if (cap && ptr && hex) {
      // Check corruption across any of the 3 components
      const isCorrupted = cap.corrupted || ptr.corrupted || hex.corrupted;

      // Remove items
      const toRemove = [cap.id, ptr.id, hex.id];
      store.removeCollectibles(toRemove);

      // Add PowerCell to inventory with corrupted flag if any component was corrupted
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
          warning: 'WARNING: Corrupted component used during build. Output binary marked as CORRUPTED!' 
        };
      }
      
      return { success: true, steps };
    } 
    
    return { success: false, steps: ['ERROR: Insufficient components. Requires: Cycle_Cap.o, Raw_Pointer.h, Hex_Payload.bin.'] };
  }

  public static installPowerCell(): { success: boolean; steps: string[]; isCorrupted?: boolean; targetBattery?: number; warning?: string } {
    const store = useGameStore.getState();
    const inv = store.inventory;
    const powercell = inv.find(i => i.type === 'powercell');

    if (powercell) {
      const isCorrupted = powercell.corrupted;
      store.removeCollectibles([powercell.id]);

      // Reset unstable battery condition and restore normal lamp state
      store.setBatteryUnstable(false);

      let targetBattery = 100;
      let warning: string | undefined;

      if (isCorrupted) {
        // Random battery between 10% and 75%
        targetBattery = Math.floor(Math.random() * (75 - 10 + 1)) + 10;
        warning = `WARNING: Corrupted PowerCell.bin executed! Kernel glitch triggered & capacity fluctuated to ${targetBattery}%.`;
      }

      const steps = [
        '[ insmod PowerCell.bin ]',
        'Mounting Daemon Module...',
        'Loading power reserves...',
        isCorrupted
          ? `SUCCESS: Battery cell mounted with memory faults. Buffer restored to ${targetBattery}%.`
          : 'SUCCESS: Battery cell mounted. Buffer restored to 100%.'
      ];

      return { 
        success: true, 
        steps, 
        isCorrupted, 
        targetBattery, 
        warning 
      };
    }

    return { success: false, steps: ['ERROR: No PowerCell.bin found in inventory or mounted state.'] };
  }

  private static rechargeAnimId: number | null = null;

  public static animateBatteryRecharge(targetBattery: number = 100, durationMs: number = 1500, onComplete?: () => void) {
    if (CraftingService.rechargeAnimId !== null) {
      cancelAnimationFrame(CraftingService.rechargeAnimId);
      CraftingService.rechargeAnimId = null;
    }

    const store = useGameStore.getState();
    const startBattery = store.battery;
    const startTime = performance.now();
    LampSystem.setTimeOn(0);

    const batteryUi = document.getElementById('battery-ui');
    if (batteryUi) {
      batteryUi.classList.add('battery-charging');
    }

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1.0);
      
      // Smooth cubic ease-out for congruent interpolation up or down
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startBattery + (targetBattery - startBattery) * ease;
      store.setBattery(current);

      if (progress < 1.0) {
        CraftingService.rechargeAnimId = requestAnimationFrame(step);
      } else {
        store.setBattery(targetBattery);
        CraftingService.rechargeAnimId = null;
        if (batteryUi) {
          batteryUi.classList.remove('battery-charging');
        }
        if (onComplete) onComplete();
      }
    };

    CraftingService.rechargeAnimId = requestAnimationFrame(step);
  }

  public static craftUnsafeBattery(): { success: boolean; steps: string[]; warning?: string } {
    const store = useGameStore.getState();
    const inv = store.inventory;
    
    // Filter ONLY loose raw components (Cycle_Cap, Raw_Pointer, Hex_Payload)
    const rawComponents = inv.filter(i => ['cap', 'pointer', 'hex'].includes(i.type));
    
    if (rawComponents.length >= 2) {
      const c1 = rawComponents[0];
      const c2 = rawComponents[1];
      const isCorrupted = c1.corrupted || c2.corrupted;

      const toRemove = [c1.id, c2.id];
      store.removeCollectibles(toRemove);

      // Add unstable patch to inventory
      store.addCollectible({
        id: 'patch_' + Date.now(),
        type: 'patch',
        name: 'PowerCell_unstable.o',
        ascii: '[!?~]',
        corrupted: isCorrupted || false,
        volatile: true
      });

      const steps = [
        '[!] WARNING: Missing required symbols. Enforcing dirty compilation...',
        `[!] Consuming: ${c1.name}, ${c2.name}`,
        '[!] Generating hotpatch with uninitialized memory offsets...',
        '[✓] Output object created: /inventory/PowerCell_unstable.o',
        "[i] Run './PowerCell_unstable.o' or 'load patch' to inject."
      ];

      if (isCorrupted) {
        return {
          success: true,
          steps,
          warning: 'WARNING: Corrupted component detected in dirty build! Object marked as CORRUPTED!'
        };
      }

      return { success: true, steps };
    }
    
    return { success: false, steps: ['ERROR: Requires at least 2 raw components (Cycle_Cap, Raw_Pointer, Hex_Payload) for emergency patch.'] };
  }

  public static installPatch(): { success: boolean; steps: string[]; isCorrupted?: boolean; targetBattery?: number; warning?: string } {
    const store = useGameStore.getState();
    const inv = store.inventory;
    const patch = inv.find(i => i.type === 'patch');

    if (patch) {
      const isCorrupted = patch.corrupted;
      store.removeCollectibles([patch.id]);

      store.setBatteryUnstable(true);

      let targetBattery = 40;
      let warning: string | undefined;

      if (isCorrupted) {
        // Random battery between 10% and 75%
        targetBattery = Math.floor(Math.random() * (75 - 10 + 1)) + 10;
        warning = `WARNING: Corrupted PowerCell_unstable.o injected! Severe kernel glitch & unstable power surge (${targetBattery}%).`;
      }

      const steps = [
        '[*] Force-injecting patch into PID 4096 (Debugger_Lamp)...',
        '[!] WARNING: Memory alignment failure. Buffer capacity capped.',
        '[!] WARNING: High thermal dissipation detected. Drain rate multiplier = 2.5x.',
        isCorrupted
          ? `[✓] Core power set with glitch surge to ${targetBattery}%.`
          : '[✓] Core power set to 40%.'
      ];

      return { 
        success: true, 
        steps, 
        isCorrupted, 
        targetBattery, 
        warning 
      };
    }

    return { success: false, steps: ['ERROR: No PowerCell_unstable.o found in inventory or already injected.'] };
  }
}

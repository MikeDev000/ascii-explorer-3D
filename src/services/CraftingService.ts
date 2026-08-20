import { useGameStore } from '../store/gameStore';

export class CraftingService {
  public static craftBatteryCell(): { success: boolean; message: string; warning?: string } {
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

      // Recharge standard: 100% battery, 0 penalty
      store.setBattery(100);
      store.setLampTimeOn(0);

      if (isCorrupted) {
        store.setTriggerGlitch(true);
        return { 
          success: true, 
          message: 'SUCCESS: Battery Cell compiled. Buffer restored to 100%.',
          warning: 'WARNING: Corrupted Hex_Payload used. System instability detected!' 
        };
      }
      
      return { success: true, message: 'SUCCESS: Battery Cell compiled. Buffer restored to 100%.' };
    } 
    
    return { success: false, message: 'ERROR: Insufficient components. Requires: Cycle_Cap.o, Raw_Pointer.h, Hex_Payload.bin.' };
  }

  public static craftUnsafeBattery(): { success: boolean; message: string; warning?: string } {
    const store = useGameStore.getState();
    const inv = store.inventory;
    
    if (inv.length >= 2) {
      const toRemove = [inv[0].id, inv[1].id];
      store.removeCollectibles(toRemove);

      // Recharge unsafe: 40% battery, heavy penalty
      store.setBattery(40);
      store.setLampTimeOn(10); // Penalty adds 10 seconds of "wear" immediately

      return { 
        success: true, 
        message: 'WARNING: Unsafe build forced. Battery restored to 40%. Severe wear penalty applied.' 
      };
    }
    
    return { success: false, message: 'ERROR: Requires at least 2 components for emergency patch.' };
  }
}

import { createStore } from 'zustand/vanilla';

export interface Collectible {
  id: string; // unique instance id
  type: string; // 'cap', 'pointer', 'hex'
  name: string;
  ascii: string;
  corrupted: boolean;
}

interface GameState {
  fps: number;
  setFps: (fps: number) => void;

  time: number;
  setTime: (time: number) => void;

  isTerminalOpen: boolean;
  setTerminalOpen: (isOpen: boolean) => void;

  battery: number;
  setBattery: (battery: number) => void;

  inventory: Collectible[];
  addCollectible: (item: Collectible) => void;
  removeCollectibles: (ids: string[]) => void;
  sanitizeCollectible: (type: string) => boolean;

  triggerGlitch: boolean;
  setTriggerGlitch: (trigger: boolean) => void;

  lampTimeOn: number;
  setLampTimeOn: (time: number) => void;
}

export const useGameStore = createStore<GameState>((set) => ({
  fps: 0,
  setFps: (fps: number) => set({ fps }),

  time: 0,
  setTime: (time: number) => set({ time }),

  isTerminalOpen: false,
  setTerminalOpen: (isTerminalOpen: boolean) => set({ isTerminalOpen }),

  battery: 100,
  setBattery: (battery: number) => set({ battery }),

  inventory: [],
  addCollectible: (item: Collectible) => set((state) => ({
    inventory: [...state.inventory, item]
  })),
  removeCollectibles: (ids: string[]) => set((state) => ({
    inventory: state.inventory.filter((item) => !ids.includes(item.id))
  })),
  sanitizeCollectible: (type: string) => {
    let sanitized = false;
    set((state) => {
      const newInv = [...state.inventory];
      const target = newInv.find((i) => i.type === type && i.corrupted);
      if (target) {
        target.corrupted = false;
        sanitized = true;
      }
      return { inventory: newInv };
    });
    return sanitized;
  },

  triggerGlitch: false,
  setTriggerGlitch: (trigger: boolean) => set({ triggerGlitch: trigger }),

  lampTimeOn: 0,
  setLampTimeOn: (time: number) => set({ lampTimeOn: time })
}));

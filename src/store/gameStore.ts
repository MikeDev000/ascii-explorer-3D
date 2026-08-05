import { createStore } from 'zustand/vanilla';

interface GameState {
  fps: number;
  setFps: (fps: number) => void;

  time: number;
  setTime: (time: number) => void;
}

export const useGameStore = createStore<GameState>((set) => ({
  fps: 0,
  setFps: (fps: number) => set({ fps }),

  time: 0,
  setTime: (time: number) => set({ time }),
}));

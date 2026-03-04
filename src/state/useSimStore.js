import { create } from 'zustand';

const useSimStore = create((set) => ({
  // Current epoch in seconds since J2000
  epoch: 0,
  // Whether time is advancing
  playing: false,
  // Simulation speed: seconds of sim time per real second
  speed: 86400, // default: 1 day per second

  setEpoch: (epoch) => set({ epoch }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
}));

export default useSimStore;

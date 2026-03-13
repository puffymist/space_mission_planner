import { create } from 'zustand';

const useSimStore = create((set) => ({
  // Current epoch in seconds since J2000
  epoch: 0,
  // Whether time is advancing
  playing: false,
  // Simulation speed: seconds of sim time per real second
  speed: 86400, // default: 1 day per second
  // Epoch step for slider (synced with speed)
  epochStep: 86400,
  // Epoch bookmarks: static saved epochs for quick-jumping
  bookmarks: [], // array of { epoch: number, label?: string }, sorted by epoch

  setEpoch: (epoch) => set({ epoch }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed, epochStep: Math.abs(speed) }),
  setEpochStep: (step) => set({ epochStep: step, speed: step }),
  setBookmarks: (bookmarks) => set({ bookmarks: [...bookmarks].sort((a, b) => a.epoch - b.epoch) }),
  addBookmark: () => set((s) => ({
    bookmarks: [...s.bookmarks, { epoch: s.epoch, label: '' }].sort((a, b) => a.epoch - b.epoch),
  })),
  updateBookmark: (index, updates) => set((s) => ({
    bookmarks: s.bookmarks.map((b, i) => i === index ? { ...b, ...updates } : b),
  })),
  removeBookmark: (index) => set((s) => ({
    bookmarks: s.bookmarks.filter((_, i) => i !== index),
  })),
  sortBookmarks: () => set((s) => ({
    bookmarks: [...s.bookmarks].sort((a, b) => a.epoch - b.epoch),
  })),
}));

export default useSimStore;

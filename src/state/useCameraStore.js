import { create } from 'zustand';
import { AU } from '../constants/physics.js';

const useCameraStore = create((set) => ({
  // Camera center in world coordinates (meters)
  centerX: 0,
  centerY: 0,
  // Pixels per meter -- start showing ~3 AU radius
  zoom: 1 / (3 * AU / 400),
  // Body to track (camera follows it), or null
  trackTarget: null,

  setCenter: (x, y) => set({ centerX: x, centerY: y }),
  setZoom: (zoom) => set({ zoom }),
  setTrackTarget: (bodyId) => set({ trackTarget: bodyId }),

  // Zoom centered on a screen point
  zoomAt: (factor, screenX, screenY, canvas) => set((state) => {
    const worldX = (screenX - canvas.width / 2) / state.zoom + state.centerX;
    const worldY = (canvas.height / 2 - screenY) / state.zoom + state.centerY;
    const newZoom = state.zoom * factor;
    const newCenterX = worldX - (screenX - canvas.width / 2) / newZoom;
    const newCenterY = worldY + (screenY - canvas.height / 2) / newZoom;
    return { zoom: newZoom, centerX: newCenterX, centerY: newCenterY };
  }),
}));

export default useCameraStore;

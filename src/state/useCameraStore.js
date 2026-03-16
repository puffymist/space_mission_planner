import { create } from 'zustand';
import { AU } from '../constants/physics.js';
import { screenToWorld } from '../canvas/camera.js';

const useCameraStore = create((set) => ({
  // Camera center in world coordinates (meters)
  centerX: 0,
  centerY: 0,
  // Pixels per meter -- start showing ~3 AU radius
  zoom: 1 / (3 * AU / 400),
  // Target to track (camera follows it), or null
  trackTarget: null,
  // Type of tracking: 'body' or 'craft'
  trackType: null,
  // Reference frame: 'inertial' (heliocentric) or 'rotating' (co-rotating with tracked body)
  frameType: 'inertial',
  // Trajectory display frame: 'inertial' | 'comoving' | 'corotating'
  trajectoryFrame: 'corotating',

  setCenter: (x, y) => set({ centerX: x, centerY: y }),
  setZoom: (zoom) => set({ zoom }),
  setTrackTarget: (bodyId) => set({ trackTarget: bodyId, frameType: 'inertial', trajectoryFrame: 'corotating' }),
  toggleFrame: () => set((s) => {
    const newFrame = s.frameType === 'inertial' ? 'rotating' : 'inertial';
    return {
      frameType: newFrame,
      trajectoryFrame: newFrame === 'rotating' ? 'corotating' : 'comoving',
    };
  }),
  setTrajectoryFrame: (mode) => set({ trajectoryFrame: mode }),
  cycleTrajectoryFrame: () => set((s) => {
    const order = ['corotating', 'comoving', 'inertial'];
    const idx = order.indexOf(s.trajectoryFrame);
    return { trajectoryFrame: order[(idx + 1) % order.length] };
  }),

  // Zoom centered on a screen point (rotation-aware via screenToWorld)
  zoomAt: (factor, screenX, screenY, canvas) => set((state) => {
    const world = screenToWorld(screenX, screenY, state, canvas);
    const newZoom = state.zoom * factor;
    const newCenterX = world.x - (screenX - canvas.width / 2) / newZoom;
    const newCenterY = world.y + (screenY - canvas.height / 2) / newZoom;
    return { zoom: newZoom, centerX: newCenterX, centerY: newCenterY };
  }),
}));

export default useCameraStore;

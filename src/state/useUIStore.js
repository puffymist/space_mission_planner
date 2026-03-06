import { create } from 'zustand';

const useUIStore = create((set) => ({
  // Hovered epoch (from trajectory or orbit mouseover)
  hoveredEpoch: null,
  // What is being hovered: 'trajectory', 'orbit', or null
  hoverType: null,
  // ID of hovered craft or body
  hoveredId: null,
  // Screen position of hover (for tooltip placement)
  hoverScreenX: 0,
  hoverScreenY: 0,
  // Transfer preview points (array of {x,y} or null)
  transferPreview: null,
  // Placement mode: click canvas to place a spacecraft
  placementMode: false,
  // Live maneuver preview: {segments, color} or null
  maneuverPreview: null,

  setHover: (epoch, type, id, sx, sy) => set({
    hoveredEpoch: epoch,
    hoverType: type,
    hoveredId: id,
    hoverScreenX: sx,
    hoverScreenY: sy,
  }),

  clearHover: () => set({
    hoveredEpoch: null,
    hoverType: null,
    hoveredId: null,
  }),
}));

export default useUIStore;

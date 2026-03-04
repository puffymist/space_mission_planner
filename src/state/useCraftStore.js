import { create } from 'zustand';
import { getBodyPosition, getBodyVelocity } from '../physics/bodyPosition.js';
import { BODY_MAP } from '../constants/bodies.js';
import { computeTrajectory } from '../physics/trajectory.js';

let nextId = 1;

const CRAFT_COLORS = ['#00ff88', '#ff6644', '#44aaff', '#ffaa00', '#ff44ff', '#44ffff'];

const useCraftStore = create((set, get) => ({
  crafts: [],
  selectedCraftId: null,

  // Launch a spacecraft from orbit around a body at the given epoch
  launchFromBody: (bodyId, epoch) => {
    const body = BODY_MAP[bodyId];
    if (!body) return;

    // Place spacecraft slightly ahead in orbit around the body
    const bodyPos = getBodyPosition(bodyId, epoch);
    const bodyVel = getBodyVelocity(bodyId, epoch);

    // Offset: place at a small orbital altitude above the body
    // For planets: offset by a fraction of their orbital radius from the Sun
    // For the Sun: offset by Mercury's orbit radius / 10
    let orbitAltitude;
    if (bodyId === 'sun') {
      orbitAltitude = 1e10; // ~0.07 AU
    } else if (body.parent === 'sun') {
      // Planet: orbit at roughly the body's Hill sphere or a fixed small offset
      orbitAltitude = body.orbitalRadius * 0.005;
    } else {
      // Moon: orbit at a fraction of the moon's orbital radius from parent
      orbitAltitude = body.orbitalRadius * 0.1;
    }

    // Place craft on the +x side (in body-relative frame) with circular orbit velocity
    const craftPos = { x: bodyPos.x + orbitAltitude, y: bodyPos.y };

    // Circular orbit speed around this body
    const G = 6.6743e-11;
    const orbitalSpeed = Math.sqrt(G * body.mass / orbitAltitude);

    // Velocity: body velocity + orbital velocity (counterclockwise = +y direction for +x offset)
    const craftVel = { x: bodyVel.x, y: bodyVel.y + orbitalSpeed };

    const id = nextId++;
    const craft = {
      id,
      name: `Craft ${id}`,
      color: CRAFT_COLORS[(id - 1) % CRAFT_COLORS.length],
      originBodyId: bodyId,
      launchEpoch: epoch,
      initialState: { x: craftPos.x, y: craftPos.y, vx: craftVel.x, vy: craftVel.y },
      events: [], // delta-v events
      segments: null, // computed trajectory segments
    };

    // Compute trajectory
    craft.segments = computeTrajectory(craft);

    set((state) => ({
      crafts: [...state.crafts, craft],
      selectedCraftId: id,
    }));
  },

  selectCraft: (id) => set({ selectedCraftId: id }),

  removeCraft: (id) => set((state) => ({
    crafts: state.crafts.filter((c) => c.id !== id),
    selectedCraftId: state.selectedCraftId === id ? null : state.selectedCraftId,
  })),

  // Add a delta-v event to a spacecraft
  addDeltaV: (craftId, epoch, dvx, dvy) => set((state) => {
    const crafts = state.crafts.map((c) => {
      if (c.id !== craftId) return c;
      const newCraft = {
        ...c,
        events: [...c.events, { epoch, dvx, dvy }].sort((a, b) => a.epoch - b.epoch),
      };
      newCraft.segments = computeTrajectory(newCraft);
      return newCraft;
    });
    return { crafts };
  }),

  // Update a delta-v event
  updateDeltaV: (craftId, eventIndex, updates) => set((state) => {
    const crafts = state.crafts.map((c) => {
      if (c.id !== craftId) return c;
      const events = [...c.events];
      events[eventIndex] = { ...events[eventIndex], ...updates };
      events.sort((a, b) => a.epoch - b.epoch);
      const newCraft = { ...c, events };
      newCraft.segments = computeTrajectory(newCraft);
      return newCraft;
    });
    return { crafts };
  }),

  // Remove a delta-v event
  removeDeltaV: (craftId, eventIndex) => set((state) => {
    const crafts = state.crafts.map((c) => {
      if (c.id !== craftId) return c;
      const events = c.events.filter((_, i) => i !== eventIndex);
      const newCraft = { ...c, events };
      newCraft.segments = computeTrajectory(newCraft);
      return newCraft;
    });
    return { crafts };
  }),

  // Recompute all trajectories (e.g., after changing duration)
  recomputeAll: () => set((state) => ({
    crafts: state.crafts.map((c) => ({
      ...c,
      segments: computeTrajectory(c),
    })),
  })),
}));

export default useCraftStore;

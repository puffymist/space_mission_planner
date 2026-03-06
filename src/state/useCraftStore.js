import { create } from 'zustand';
import { getBodyPosition, getBodyVelocity, getAllBodyPositions } from '../physics/bodyPosition.js';
import { BODY_MAP } from '../constants/bodies.js';
import { computeTrajectory } from '../physics/trajectory.js';
import { sub, normalize, scale, add } from '../utils/vector.js';
import { nearestBody } from '../physics/gravity.js';

let nextId = 1;

const CRAFT_COLORS = ['#00ff88', '#ff6644', '#44aaff', '#ffaa00', '#ff44ff', '#44ffff'];
const G = 6.6743e-11;

// Compute default orbit altitude for a body (in meters)
function defaultAltitude(body) {
  if (body.id === 'sun') return 1e10; // ~0.07 AU
  if (body.parent === 'sun') {
    // Planet: scale with body mass (~cube-root), floor at 10,000 km
    // Earth ≈ 1.8e7 m (18,000 km), Jupiter ≈ 1.2e8 m (124,000 km)
    return Math.max(Math.pow(body.mass, 1 / 3) * 0.1, 1e7);
  }
  // Moon: fraction of moon's orbital radius from parent
  return body.orbitalRadius * 0.05;
}

const useCraftStore = create((set, get) => ({
  crafts: [],
  selectedCraftId: null,

  // Launch a spacecraft from orbit around a body at the given epoch
  // altitudeM: optional altitude in meters; uses defaultAltitude if omitted
  launchFromBody: (bodyId, epoch, altitudeM) => {
    const body = BODY_MAP[bodyId];
    if (!body) return;

    const orbitAltitude = altitudeM > 0 ? altitudeM : defaultAltitude(body);
    const bodyPos = getBodyPosition(bodyId, epoch);
    const bodyVel = getBodyVelocity(bodyId, epoch);

    let craftPos, craftVel;

    if (body.parent) {
      // Radial direction from parent to body
      const parentPos = getBodyPosition(body.parent, epoch);
      const radDir = normalize(sub(bodyPos, parentPos));

      // Place craft outward from parent along radial direction
      craftPos = add(bodyPos, scale(radDir, orbitAltitude));

      // Tangent perpendicular to radDir, same rotation sense as body's orbit
      const sign = body.angularVelocity >= 0 ? 1 : -1;
      const tanDir = { x: -radDir.y * sign, y: radDir.x * sign };

      // Circular orbit speed around this body
      const orbitalSpeed = Math.sqrt(G * body.mass / orbitAltitude);
      craftVel = add(bodyVel, scale(tanDir, orbitalSpeed));
    } else {
      // Sun: no parent, place on +X with +Y velocity
      craftPos = { x: bodyPos.x + orbitAltitude, y: bodyPos.y };
      const orbitalSpeed = Math.sqrt(G * body.mass / orbitAltitude);
      craftVel = { x: bodyVel.x, y: bodyVel.y + orbitalSpeed };
    }

    const id = nextId++;
    const craft = {
      id,
      name: `Craft ${id}`,
      color: CRAFT_COLORS[(id - 1) % CRAFT_COLORS.length],
      originBodyId: bodyId,
      launchEpoch: epoch,
      orbitAltitude,
      initialState: { x: craftPos.x, y: craftPos.y, vx: craftVel.x, vy: craftVel.y },
      events: [],
      segments: null,
    };

    craft.segments = computeTrajectory(craft);

    set((state) => ({
      crafts: [...state.crafts, craft],
      selectedCraftId: id,
    }));
  },

  // Place spacecraft at an arbitrary world position, co-moving with nearest body
  placeAtPosition: (x, y, epoch) => {
    const positions = getAllBodyPositions(epoch);
    const { bodyId } = nearestBody({ x, y }, positions);
    const bodyVel = getBodyVelocity(bodyId, epoch);

    const id = nextId++;
    const craft = {
      id,
      name: `Craft ${id}`,
      color: CRAFT_COLORS[(id - 1) % CRAFT_COLORS.length],
      originBodyId: bodyId,
      launchEpoch: epoch,
      orbitAltitude: null,
      initialState: { x, y, vx: bodyVel.x, vy: bodyVel.y },
      events: [],
      segments: null,
    };

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

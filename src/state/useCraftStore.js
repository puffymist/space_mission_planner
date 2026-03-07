import { create } from 'zustand';
import { getBodyPosition, getBodyVelocity, getAllBodyPositions } from '../physics/bodyPosition.js';
import { BODY_MAP } from '../constants/bodies.js';
import { sub, normalize, scale, add } from '../utils/vector.js';
import { nearestBody } from '../physics/gravity.js';

let nextId = 1;

const CRAFT_COLORS = ['#00ff88', '#ff6644', '#44aaff', '#ffaa00', '#ff44ff', '#44ffff'];
const G = 6.6743e-11;
const FULL_DURATION = 100 * 365.25 * 86400; // 100 years for background worker

// --- Web Worker lifecycle ---
const activeWorkers = {};

function startComputation(craft, set) {
  // Terminate existing worker for this craft
  if (activeWorkers[craft.id]) {
    activeWorkers[craft.id].terminate();
    delete activeWorkers[craft.id];
  }

  const worker = new Worker(
    new URL('../physics/trajectoryWorker.js', import.meta.url),
    { type: 'module' }
  );

  activeWorkers[craft.id] = worker;

  worker.onmessage = (e) => {
    const { type, craftId, segments, closedOrbit, closureIndices, coastSegStart } = e.data;

    if (type === 'progress' || type === 'done') {
      set((state) => {
        const newCrafts = state.crafts.map((c) => {
          if (c.id !== craftId) return c;
          const updated = { ...c, segments };
          if (type === 'done') {
            updated.closedOrbit = closedOrbit || false;
            updated.closureIndices = closureIndices || [];
            updated.coastSegStart = coastSegStart || 0;
          }
          return updated;
        });
        const newComputing = new Set(state.computingCrafts);
        if (type === 'done') newComputing.delete(craftId);
        return { crafts: newCrafts, computingCrafts: newComputing };
      });
    }

    if (type === 'done') {
      delete activeWorkers[craft.id];
    }
  };

  worker.onerror = (err) => {
    console.error('Trajectory worker error:', err);
    delete activeWorkers[craft.id];
    set((state) => {
      const newComputing = new Set(state.computingCrafts);
      newComputing.delete(craft.id);
      return { computingCrafts: newComputing };
    });
  };

  set((state) => {
    const newComputing = new Set(state.computingCrafts);
    newComputing.add(craft.id);
    return { computingCrafts: newComputing };
  });

  worker.postMessage({
    type: 'compute',
    craft: {
      id: craft.id,
      initialState: craft.initialState,
      launchEpoch: craft.launchEpoch,
      events: craft.events,
    },
    duration: FULL_DURATION,
    firstChunkDuration: 90 * 86400, // 90 days for fast initial feedback
  });
}

// Kick off worker for trajectory computation.
// Old segments stay visible until the first worker progress message replaces them.
function computeAndExtend(craft, set) {
  startComputation(craft, set);
}

// Compute default orbit altitude for a body (in meters)
function defaultAltitude(body) {
  if (body.id === 'sun') return 1e10; // ~0.07 AU
  if (body.parent === 'sun') {
    return Math.max(Math.pow(body.mass, 1 / 3) * 0.1, 1e7);
  }
  return body.orbitalRadius * 0.05;
}

const useCraftStore = create((set, get) => ({
  crafts: [],
  selectedCraftId: null,
  computingCrafts: new Set(),

  launchFromBody: (bodyId, epoch, altitudeM) => {
    const body = BODY_MAP[bodyId];
    if (!body) return;

    const orbitAltitude = altitudeM > 0 ? altitudeM : defaultAltitude(body);
    const bodyPos = getBodyPosition(bodyId, epoch);
    const bodyVel = getBodyVelocity(bodyId, epoch);

    let craftPos, craftVel;

    if (body.parent) {
      const parentPos = getBodyPosition(body.parent, epoch);
      const radDir = normalize(sub(bodyPos, parentPos));
      craftPos = add(bodyPos, scale(radDir, orbitAltitude));
      const sign = body.angularVelocity >= 0 ? 1 : -1;
      const tanDir = { x: -radDir.y * sign, y: radDir.x * sign };
      const orbitalSpeed = Math.sqrt(G * body.mass / orbitAltitude);
      craftVel = add(bodyVel, scale(tanDir, orbitalSpeed));
    } else {
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

    computeAndExtend(craft, set);

    set((state) => ({
      crafts: [...state.crafts, craft],
      selectedCraftId: id,
    }));
  },

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

    computeAndExtend(craft, set);

    set((state) => ({
      crafts: [...state.crafts, craft],
      selectedCraftId: id,
    }));
  },

  selectCraft: (id) => set({ selectedCraftId: id }),

  removeCraft: (id) => {
    if (activeWorkers[id]) {
      activeWorkers[id].terminate();
      delete activeWorkers[id];
    }
    set((state) => ({
      crafts: state.crafts.filter((c) => c.id !== id),
      selectedCraftId: state.selectedCraftId === id ? null : state.selectedCraftId,
    }));
  },

  addDeltaV: (craftId, epoch, dvx, dvy) => set((state) => {
    const crafts = state.crafts.map((c) => {
      if (c.id !== craftId) return c;
      const newCraft = {
        ...c,
        events: [...c.events, { epoch, dvx, dvy }].sort((a, b) => a.epoch - b.epoch),
      };
      computeAndExtend(newCraft, set);
      return newCraft;
    });
    return { crafts };
  }),

  updateDeltaV: (craftId, eventIndex, updates) => set((state) => {
    const crafts = state.crafts.map((c) => {
      if (c.id !== craftId) return c;
      const events = [...c.events];
      events[eventIndex] = { ...events[eventIndex], ...updates };
      events.sort((a, b) => a.epoch - b.epoch);
      const newCraft = { ...c, events };
      computeAndExtend(newCraft, set);
      return newCraft;
    });
    return { crafts };
  }),

  removeDeltaV: (craftId, eventIndex) => set((state) => {
    const crafts = state.crafts.map((c) => {
      if (c.id !== craftId) return c;
      const events = c.events.filter((_, i) => i !== eventIndex);
      const newCraft = { ...c, events };
      computeAndExtend(newCraft, set);
      return newCraft;
    });
    return { crafts };
  }),

  updateInitialState: (craftId, updates) => set((state) => {
    const crafts = state.crafts.map((c) => {
      if (c.id !== craftId) return c;
      const newCraft = { ...c };
      if (updates.launchEpoch !== undefined) newCraft.launchEpoch = updates.launchEpoch;
      if (updates.x !== undefined || updates.y !== undefined ||
          updates.vx !== undefined || updates.vy !== undefined) {
        newCraft.initialState = {
          ...c.initialState,
          ...(updates.x !== undefined ? { x: updates.x } : {}),
          ...(updates.y !== undefined ? { y: updates.y } : {}),
          ...(updates.vx !== undefined ? { vx: updates.vx } : {}),
          ...(updates.vy !== undefined ? { vy: updates.vy } : {}),
        };
      }
      computeAndExtend(newCraft, set);
      return newCraft;
    });
    return { crafts };
  }),

  recomputeAll: () => {
    const state = useCraftStore.getState();
    const set = useCraftStore.setState.bind(useCraftStore);
    for (const craft of state.crafts) {
      startComputation(craft, set);
    }
  },
}));

export default useCraftStore;

import { create } from 'zustand';
import { getBodyPosition, getBodyVelocity, getAllBodyPositions } from '../physics/bodyPosition.js';
import { BODY_MAP } from '../constants/bodies.js';
import { sub, normalize, scale, add, rotate } from '../utils/vector.js';
import { nearestBody } from '../physics/gravity.js';
import { interpolateState } from '../utils/interpolate.js';
import { computeDeltaV } from '../physics/deltaV.js';
import { integrateSegment } from '../physics/integrator.js';

let nextId = 1;
let nextLinkGroup = 1;

const CRAFT_COLORS = ['#00ff88', '#ff6644', '#44aaff', '#ffaa00', '#ff44ff', '#44ffff'];
const G = 6.6743e-11;

// Recompute linked events' dvx/dvy by forward-integrating from the NEW initial state.
// This avoids using stale trajectory segments that don't reflect the updated launch.
function recomputeLinkedEvents(events, linkedGroup, deltaT, initialState, launchEpoch, alreadyShiftedIndices = new Set()) {
  // Shift linked event epochs (skip indices already at their new epoch)
  const newEvents = events.map((ev, i) => {
    if (ev.linkedGroup === linkedGroup && !alreadyShiftedIndices.has(i)) {
      return { ...ev, epoch: ev.epoch + deltaT };
    }
    return ev;
  });
  newEvents.sort((a, b) => a.epoch - b.epoch);

  // Find the last linked event epoch so we know when to stop integrating
  let lastLinkedEpoch = -Infinity;
  for (const ev of newEvents) {
    if (ev.linkedGroup === linkedGroup) lastLinkedEpoch = ev.epoch;
  }
  if (lastLinkedEpoch < launchEpoch) return newEvents;

  // Forward-integrate from new initial state, recomputing specs at each linked event
  let { x, y, vx, vy } = initialState;
  let t = launchEpoch;

  for (let i = 0; i < newEvents.length; i++) {
    const ev = newEvents[i];
    if (ev.epoch < t) continue;
    if (ev.epoch > lastLinkedEpoch) break;

    // Propagate to this event's epoch
    if (ev.epoch > t) {
      const pts = integrateSegment(x, y, vx, vy, t, ev.epoch);
      const last = pts[pts.length - 1];
      x = last.x; y = last.y; vx = last.vx; vy = last.vy;
      t = ev.epoch;
    }

    // Recompute dvx/dvy for linked events with a spec
    if (ev.linkedGroup === linkedGroup && ev.spec) {
      const craftState = { x, y, vx, vy };
      const dv = computeDeltaV(ev.spec.frame, ev.spec.angle, ev.spec.magnitude, craftState, ev.spec.refBody, ev.epoch);
      newEvents[i] = { ...ev, dvx: dv.dvx, dvy: dv.dvy };
    }

    // Apply this event's delta-v before continuing
    vx += newEvents[i].dvx;
    vy += newEvents[i].dvy;
  }

  return newEvents;
}
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

  // Strip spec/linkedGroup from events sent to worker (worker only needs epoch/dvx/dvy)
  worker.postMessage({
    type: 'compute',
    craft: {
      id: craft.id,
      initialState: craft.initialState,
      launchEpoch: craft.launchEpoch,
      events: craft.events.map(e => ({ epoch: e.epoch, dvx: e.dvx, dvy: e.dvy })),
    },
    duration: FULL_DURATION,
    firstChunkDuration: 86400, // 24 hours for fast initial feedback
  });
}

// Kick off worker for trajectory computation.
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

// Compute launch state for a body orbit specification
function computeLaunchState(bodyId, epoch, orbitAltitude, direction = 'prograde', launchPhase = 0) {
  const body = BODY_MAP[bodyId];
  if (!body) return null;
  const alt = orbitAltitude > 0 ? orbitAltitude : defaultAltitude(body);
  const bodyPos = getBodyPosition(bodyId, epoch);
  const bodyVel = getBodyVelocity(bodyId, epoch);

  let craftPos, craftVel;
  if (body.parent) {
    const parentPos = getBodyPosition(body.parent, epoch);
    const baseRadDir = normalize(sub(bodyPos, parentPos));
    const phaseRad = (launchPhase || 0) * Math.PI / 180;
    const radDir = phaseRad === 0 ? baseRadDir : rotate(baseRadDir, phaseRad);
    craftPos = add(bodyPos, scale(radDir, alt));
    const sign = body.angularVelocity >= 0 ? 1 : -1;
    const tanDir = { x: -radDir.y * sign, y: radDir.x * sign };
    const orbitalSpeed = Math.sqrt(G * body.mass / alt);
    craftVel = add(bodyVel, scale(tanDir, orbitalSpeed));
  } else {
    // Sun: no parent, use phase angle from +X
    const phaseRad = (launchPhase || 0) * Math.PI / 180;
    const radDir = { x: Math.cos(phaseRad), y: Math.sin(phaseRad) };
    craftPos = add(bodyPos, scale(radDir, alt));
    const orbitalSpeed = Math.sqrt(G * body.mass / alt);
    const tanDir = { x: -radDir.y, y: radDir.x };
    craftVel = add(bodyVel, scale(tanDir, orbitalSpeed));
  }
  return { x: craftPos.x, y: craftPos.y, vx: craftVel.x, vy: craftVel.y };
}

const useCraftStore = create((set, get) => ({
  crafts: [],
  selectedCraftId: null,
  computingCrafts: new Set(),

  launchFromBody: (bodyId, epoch, altitudeM) => {
    const body = BODY_MAP[bodyId];
    if (!body) return;

    const orbitAltitude = altitudeM > 0 ? altitudeM : defaultAltitude(body);
    const state = computeLaunchState(bodyId, epoch, orbitAltitude, 'prograde', 0);
    if (!state) return;

    const id = nextId++;
    const craft = {
      id,
      name: `Craft ${id}`,
      color: CRAFT_COLORS[(id - 1) % CRAFT_COLORS.length],
      originBodyId: bodyId,
      launchEpoch: epoch,
      orbitAltitude,
      launchDirection: 'prograde',
      launchPhase: 0,
      initialState: state,
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
      launchPhase: 0,
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

  // addDeltaV now accepts optional spec metadata
  addDeltaV: (craftId, epoch, dvx, dvy, spec) => set((state) => {
    const crafts = state.crafts.map((c) => {
      if (c.id !== craftId) return c;
      const event = { epoch, dvx, dvy };
      if (spec) event.spec = spec;
      const newCraft = {
        ...c,
        events: [...c.events, event].sort((a, b) => a.epoch - b.epoch),
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
      const oldEvent = events[eventIndex];

      // Epoch-linking: cascade epoch changes to linked events
      if (updates.epoch !== undefined && oldEvent.linkedGroup) {
        const deltaT = updates.epoch - oldEvent.epoch;
        const newCraft = { ...c };

        // Apply updates to the edited event first
        let newEvents = events.map((ev, i) =>
          i === eventIndex ? { ...ev, ...updates } : ev
        );

        // Shift launch if linked to same group (need new initial state for propagation)
        if (newCraft.launchLinkedGroup === oldEvent.linkedGroup) {
          newCraft.launchEpoch += deltaT;
          const hasSpec = newCraft.originBodyId && newCraft.orbitAltitude && newCraft.launchDirection;
          if (hasSpec) {
            const newState = computeLaunchState(
              newCraft.originBodyId, newCraft.launchEpoch,
              newCraft.orbitAltitude, newCraft.launchDirection, newCraft.launchPhase || 0
            );
            if (newState) newCraft.initialState = newState;
          }
        }

        // Recompute other linked events via forward integration from new initial state
        newCraft.events = recomputeLinkedEvents(
          newEvents, oldEvent.linkedGroup, deltaT,
          newCraft.initialState, newCraft.launchEpoch,
          new Set([eventIndex])
        );

        computeAndExtend(newCraft, set);
        return newCraft;
      }

      // Normal update (no linking)
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
      if (updates.launchPhase !== undefined) newCraft.launchPhase = updates.launchPhase;

      const hasManualEdits = updates.x !== undefined || updates.y !== undefined ||
          updates.vx !== undefined || updates.vy !== undefined;
      const epochChanged = updates.launchEpoch !== undefined && updates.launchEpoch !== c.launchEpoch;
      const phaseChanged = updates.launchPhase !== undefined && updates.launchPhase !== (c.launchPhase || 0);
      const hasLaunchSpec = c.originBodyId && c.orbitAltitude && c.launchDirection;

      if (hasManualEdits) {
        // Manual state editing — clear launch spec
        newCraft.initialState = {
          ...c.initialState,
          ...(updates.x !== undefined ? { x: updates.x } : {}),
          ...(updates.y !== undefined ? { y: updates.y } : {}),
          ...(updates.vx !== undefined ? { vx: updates.vx } : {}),
          ...(updates.vy !== undefined ? { vy: updates.vy } : {}),
        };
        newCraft.launchDirection = null;
      } else if ((epochChanged || phaseChanged) && hasLaunchSpec) {
        // Epoch or phase changed with launch spec — recompute state from spec
        const newState = computeLaunchState(
          c.originBodyId, newCraft.launchEpoch, c.orbitAltitude,
          c.launchDirection, newCraft.launchPhase || 0
        );
        if (newState) newCraft.initialState = newState;

        // Epoch-linking: cascade epoch change to linked events
        if (epochChanged && newCraft.launchLinkedGroup) {
          const deltaT = newCraft.launchEpoch - c.launchEpoch;
          newCraft.events = recomputeLinkedEvents(
            newCraft.events, newCraft.launchLinkedGroup, deltaT,
            newCraft.initialState, newCraft.launchEpoch
          );
        }
      }
      computeAndExtend(newCraft, set);
      return newCraft;
    });
    return { crafts };
  }),

  // Epoch-linking: link events (and optionally launch) into a group
  linkEvents: (craftId, eventIndices, includeLaunch = false) => set((state) => {
    const groupId = `link-${nextLinkGroup++}`;
    const crafts = state.crafts.map((c) => {
      if (c.id !== craftId) return c;
      const events = c.events.map((ev, i) =>
        eventIndices.includes(i) ? { ...ev, linkedGroup: groupId } : ev
      );
      const newCraft = { ...c, events };
      if (includeLaunch) newCraft.launchLinkedGroup = groupId;
      return newCraft;
    });
    return { crafts };
  }),

  unlinkEvent: (craftId, eventIndex) => set((state) => {
    const crafts = state.crafts.map((c) => {
      if (c.id !== craftId) return c;
      const events = c.events.map((ev, i) => {
        if (i !== eventIndex) return ev;
        const { linkedGroup, ...rest } = ev;
        return rest;
      });
      return { ...c, events };
    });
    return { crafts };
  }),

  unlinkLaunch: (craftId) => set((state) => {
    const crafts = state.crafts.map((c) => {
      if (c.id !== craftId) return c;
      const { launchLinkedGroup, ...rest } = c;
      return rest;
    });
    return { crafts };
  }),

  joinGroup: (craftId, eventIndex, groupId) => set((state) => {
    const crafts = state.crafts.map((c) => {
      if (c.id !== craftId) return c;
      const events = c.events.map((ev, i) =>
        i === eventIndex ? { ...ev, linkedGroup: groupId } : ev
      );
      return { ...c, events };
    });
    return { crafts };
  }),

  joinLaunchToGroup: (craftId, groupId) => set((state) => {
    const crafts = state.crafts.map((c) =>
      c.id === craftId ? { ...c, launchLinkedGroup: groupId } : c
    );
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

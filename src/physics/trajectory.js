import { integrateSegment } from './integrator.js';

// Default trajectory duration: 2 years
const DEFAULT_DURATION = 2 * 365.25 * 86400;

// Compute the full trajectory for a spacecraft
// spacecraft: { initialState: {x, y, vx, vy}, launchEpoch, events: [{epoch, dvx, dvy}] }
// Returns array of segments, each being an array of {t, x, y, vx, vy} points
export function computeTrajectory(spacecraft, duration = DEFAULT_DURATION) {
  const events = [...spacecraft.events].sort((a, b) => a.epoch - b.epoch);
  const segments = [];

  let x = spacecraft.initialState.x;
  let y = spacecraft.initialState.y;
  let vx = spacecraft.initialState.vx;
  let vy = spacecraft.initialState.vy;
  let t = spacecraft.launchEpoch;
  const tEnd = spacecraft.launchEpoch + duration;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.epoch <= t) continue; // skip past events
    if (ev.epoch > tEnd) break;

    // Integrate from current state to this event
    const pts = integrateSegment(x, y, vx, vy, t, ev.epoch);
    segments.push(pts);

    // Apply delta-v
    const last = pts[pts.length - 1];
    x = last.x;
    y = last.y;
    vx = last.vx + ev.dvx;
    vy = last.vy + ev.dvy;
    t = ev.epoch;
  }

  // Integrate remaining duration
  if (t < tEnd) {
    const pts = integrateSegment(x, y, vx, vy, t, tEnd);
    segments.push(pts);
  }

  return segments;
}

// Recompute from a specific event index onward (optimization)
export function recomputeFrom(spacecraft, eventIndex, existingSegments, duration = DEFAULT_DURATION) {
  // For now, just recompute everything. Can optimize later.
  return computeTrajectory(spacecraft, duration);
}

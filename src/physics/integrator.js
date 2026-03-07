import { computeAcceleration } from './gravity.js';
import { getAllBodyPositions } from './bodyPosition.js';

const DT_MIN = 10;      // minimum time step: 10 seconds
const DT_MAX = 86400;   // maximum time step: 24 hour
const SAFETY = 0.01;    // fraction of distance-to-nearest-body per step

// Compute adaptive time step based on proximity to bodies
function adaptiveStep(pos, speed, bodyPositions) {
  let minTimescale = Infinity;

  // Use all body positions to find the most constraining timescale
  for (const id in bodyPositions) {
    const bp = bodyPositions[id];
    const dx = pos.x - bp.x;
    const dy = pos.y - bp.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      // Time to cross a fraction of the distance to this body
      const ts = dist / Math.max(speed, 1);
      if (ts < minTimescale) minTimescale = ts;
    }
  }

  const dt = SAFETY * minTimescale;
  return Math.max(DT_MIN, Math.min(DT_MAX, dt));
}

// Integrate a trajectory segment using Velocity Verlet
// Returns array of {t, x, y, vx, vy} points
export function integrateSegment(x0, y0, vx0, vy0, tStart, tEnd, maxPoints = 10000) {
  const points = [];
  let x = x0, y = y0, vx = vx0, vy = vy0;
  let t = tStart;
  const direction = tEnd >= tStart ? 1 : -1;
  const duration = Math.abs(tEnd - tStart);

  // Record first point
  points.push({ t, x, y, vx, vy });

  // Initial body positions and acceleration
  let bodyPos = getAllBodyPositions(t);
  let acc = computeAcceleration({ x, y }, t, bodyPos);

  // Recording interval: store ~5000 points max
  const recordInterval = Math.max(300, duration / 5000);
  let lastRecordT = t;

  while (direction * (tEnd - t) > DT_MIN * 0.5) {
    const speed = Math.sqrt(vx * vx + vy * vy);
    let dt = adaptiveStep({ x, y }, speed, bodyPos);
    dt = Math.min(dt, Math.abs(tEnd - t)); // don't overshoot
    dt *= direction;

    // Velocity Verlet step
    // 1. Update position
    const nx = x + vx * dt + 0.5 * acc.x * dt * dt;
    const ny = y + vy * dt + 0.5 * acc.y * dt * dt;

    // 2. Compute new acceleration
    const nt = t + dt;
    bodyPos = getAllBodyPositions(nt);
    const newAcc = computeAcceleration({ x: nx, y: ny }, nt, bodyPos);

    // 3. Update velocity
    const nvx = vx + 0.5 * (acc.x + newAcc.x) * dt;
    const nvy = vy + 0.5 * (acc.y + newAcc.y) * dt;

    x = nx; y = ny; vx = nvx; vy = nvy;
    t = nt; acc = newAcc;

    // Record point at fixed time intervals
    if (Math.abs(t - lastRecordT) >= recordInterval) {
      points.push({ t, x, y, vx, vy });
      lastRecordT = t;
    }
  }

  // Ensure final point is recorded
  const last = points[points.length - 1];
  if (Math.abs(last.t - t) > 0.5) {
    points.push({ t, x, y, vx, vy });
  }

  return points;
}

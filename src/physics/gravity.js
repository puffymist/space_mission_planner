import BODIES from '../constants/bodies.js';
import { G } from '../constants/physics.js';
import { getAllBodyPositions } from './bodyPosition.js';

// Compute gravitational acceleration at position {x, y} at time t (seconds since J2000)
// Returns {x, y} acceleration in m/s^2
export function computeAcceleration(pos, t, bodyPositions) {
  let ax = 0;
  let ay = 0;

  for (const body of BODIES) {
    if (body.mass === 0) continue;

    const bp = bodyPositions[body.id];
    const dx = pos.x - bp.x;
    const dy = pos.y - bp.y;
    const r2 = dx * dx + dy * dy;

    // Skip if spacecraft is at the exact body center (shouldn't happen)
    if (r2 < 1) continue;

    const r = Math.sqrt(r2);
    const r3 = r2 * r;
    const f = -G * body.mass / r3;

    ax += f * dx;
    ay += f * dy;
  }

  return { x: ax, y: ay };
}

// Compute minimum distance from pos to any body and its id
export function nearestBody(pos, bodyPositions) {
  let minDist = Infinity;
  let minId = null;

  for (const body of BODIES) {
    const bp = bodyPositions[body.id];
    const dx = pos.x - bp.x;
    const dy = pos.y - bp.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) {
      minDist = d;
      minId = body.id;
    }
  }

  return { dist: minDist, bodyId: minId };
}

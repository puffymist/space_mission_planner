import BODIES, { BODY_MAP } from '../constants/bodies.js';
import { G } from '../constants/physics.js';
import { getAllBodyPositions } from './bodyPosition.js';

// Precompute Hill sphere radii (SOI approximation)
// r_Hill = a * (m / (3M))^(1/3) where a = orbital radius, m = body mass, M = parent mass
const hillRadii = {};
for (const body of BODIES) {
  if (body.parent) {
    const parent = BODY_MAP[body.parent];
    if (parent) {
      hillRadii[body.id] = body.orbitalRadius * Math.cbrt(body.mass / (3 * parent.mass));
    }
  }
}

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

// Determine which body's SOI the position is in (hierarchy-aware)
// Checks deepest level first (moons before planets); defaults to 'sun'
export function soiBody(pos, bodyPositions) {
  // Check moons first (deepest hierarchy), then planets
  const levels = [
    BODIES.filter(b => b.parent && b.parent !== 'sun'), // moons
    BODIES.filter(b => b.parent === 'sun'),              // planets
  ];
  for (const group of levels) {
    for (const body of group) {
      const soi = hillRadii[body.id];
      if (!soi) continue;
      const bp = bodyPositions[body.id];
      const dx = pos.x - bp.x;
      const dy = pos.y - bp.y;
      if (dx * dx + dy * dy < soi * soi) return body.id;
    }
  }
  return 'sun';
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

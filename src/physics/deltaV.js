import { normalize, sub, rotate } from '../utils/vector.js';

// Direction helper: returns a unit vector for the delta-v direction

// Along spacecraft velocity (prograde)
export function prograde(vx, vy) {
  return normalize({ x: vx, y: vy });
}

// Opposite spacecraft velocity (retrograde)
export function retrograde(vx, vy) {
  const p = prograde(vx, vy);
  return { x: -p.x, y: -p.y };
}

// Perpendicular to velocity, leftward (normal - counterclockwise from prograde)
export function normal(vx, vy) {
  const p = prograde(vx, vy);
  return { x: -p.y, y: p.x };
}

// Perpendicular to velocity, rightward (anti-normal)
export function antiNormal(vx, vy) {
  const n = normal(vx, vy);
  return { x: -n.x, y: -n.y };
}

// Away from a body (radial out)
export function radialOut(craftPos, bodyPos) {
  return normalize(sub(craftPos, bodyPos));
}

// Toward a body (radial in)
export function radialIn(craftPos, bodyPos) {
  const out = radialOut(craftPos, bodyPos);
  return { x: -out.x, y: -out.y };
}

// Counterclockwise relative to body (perpendicular to radial out, rotated +90 deg)
export function anticlockwise(craftPos, bodyPos) {
  const out = radialOut(craftPos, bodyPos);
  return { x: -out.y, y: out.x };
}

// Clockwise relative to body
export function clockwise(craftPos, bodyPos) {
  const acw = anticlockwise(craftPos, bodyPos);
  return { x: -acw.x, y: -acw.y };
}

// All direction helpers, returning labeled options
export const DIRECTIONS = [
  { id: 'prograde', label: 'Prograde', fn: 'prograde' },
  { id: 'retrograde', label: 'Retrograde', fn: 'retrograde' },
  { id: 'normal', label: 'Normal', fn: 'normal' },
  { id: 'antiNormal', label: 'Anti-Normal', fn: 'antiNormal' },
  { id: 'radialOut', label: 'Radial Out', fn: 'radialOut', needsBody: true },
  { id: 'radialIn', label: 'Radial In', fn: 'radialIn', needsBody: true },
  { id: 'anticlockwise', label: 'Anticlockwise', fn: 'anticlockwise', needsBody: true },
  { id: 'clockwise', label: 'Clockwise', fn: 'clockwise', needsBody: true },
  { id: 'custom', label: 'Custom Angle', fn: 'custom' },
];

// Compute the delta-v vector given direction, magnitude, craft state, and optional body position
// For custom angle: pass angleDeg (degrees counterclockwise from +X axis)
export function computeDeltaV(directionId, magnitude, craftState, bodyPos, angleDeg) {
  let dir;
  switch (directionId) {
    case 'prograde': dir = prograde(craftState.vx, craftState.vy); break;
    case 'retrograde': dir = retrograde(craftState.vx, craftState.vy); break;
    case 'normal': dir = normal(craftState.vx, craftState.vy); break;
    case 'antiNormal': dir = antiNormal(craftState.vx, craftState.vy); break;
    case 'radialOut': dir = radialOut(craftState, bodyPos); break;
    case 'radialIn': dir = radialIn(craftState, bodyPos); break;
    case 'anticlockwise': dir = anticlockwise(craftState, bodyPos); break;
    case 'clockwise': dir = clockwise(craftState, bodyPos); break;
    case 'custom': {
      const rad = (angleDeg || 0) * Math.PI / 180;
      dir = { x: Math.cos(rad), y: Math.sin(rad) };
      break;
    }
    default: dir = prograde(craftState.vx, craftState.vy);
  }
  return { dvx: dir.x * magnitude, dvy: dir.y * magnitude };
}

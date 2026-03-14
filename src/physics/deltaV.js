import { normalize, sub, rotate, cross2d, mag } from '../utils/vector.js';
import { G } from '../constants/physics.js';
import { BODY_MAP } from '../constants/bodies.js';
import { getBodyPosition, getBodyVelocity } from './bodyPosition.js';

// Reference frames for delta-V direction specification
export const FRAMES = [
  { id: 'inertial', label: 'Inertial' },
  { id: 'velocity', label: 'Velocity' },
  { id: 'body', label: 'Body' },
  { id: 'circularize', label: 'Circularize' },
];

// Preset angles for quick selection per frame
export const PRESETS = {
  velocity: [
    { label: 'Forward', angle: 0 },
    { label: 'Left', angle: 90 },
    { label: 'Backward', angle: 180 },
    { label: 'Right', angle: 270 },
  ],
  body: [
    { label: 'Pro', angle: 0 },
    { label: 'Rad-', angle: 90 },
    { label: 'Retro', angle: 180 },
    { label: 'Rad+', angle: 270 },
  ],
  inertial: [
    { label: '+X', angle: 0 },
    { label: '+Y', angle: 90 },
    { label: '-X', angle: 180 },
    { label: '-Y', angle: 270 },
  ],
};

/**
 * Compute delta-V vector given frame, angle, magnitude, and context.
 *
 * @param {string} frame - 'inertial', 'velocity', 'body', or 'circularize'
 * @param {number} angleDeg - angle in degrees within the frame (ignored for 'circularize')
 * @param {number} magnitude - delta-V magnitude in m/s (ignored for 'circularize')
 * @param {object} craftState - {x, y, vx, vy} spacecraft state at maneuver epoch
 * @param {string} [refBodyId] - reference body id (for 'velocity', 'body', and 'circularize' frames)
 * @param {number} [epoch] - epoch for body position/velocity lookup (for 'velocity', 'body', and 'circularize' frames)
 * @returns {{dvx: number, dvy: number}}
 */
export function computeDeltaV(frame, angleDeg, magnitude, craftState, refBodyId, epoch) {
  const rad = (angleDeg || 0) * Math.PI / 180;
  let dir;

  switch (frame) {
    case 'inertial': {
      dir = { x: Math.cos(rad), y: Math.sin(rad) };
      break;
    }
    case 'velocity': {
      // 0°=forward (along velocity), 90°=left (CCW from velocity)
      // If refBodyId provided, use velocity relative to that body
      let velX = craftState.vx, velY = craftState.vy;
      if (refBodyId) {
        const bodyVel = getBodyVelocity(refBodyId, epoch);
        velX -= bodyVel.x;
        velY -= bodyVel.y;
      }
      const vel = normalize({ x: velX, y: velY });
      dir = rotate(vel, rad);
      break;
    }
    case 'body': {
      // 0°=prograde relative to body (tangent CCW), 90°=radial out
      const bodyPos = getBodyPosition(refBodyId, epoch);
      const radialOut = normalize(sub(craftState, bodyPos));
      const prograde = { x: -radialOut.y, y: radialOut.x }; // rotate radial +90°
      dir = rotate(prograde, rad);
      break;
    }
    case 'circularize':
      // angleDeg encodes orbit sense: 0=auto, 1=prograde(CCW), -1=retrograde(CW)
      return circularizeDeltaV(craftState, refBodyId, epoch, angleDeg);
    default:
      dir = { x: Math.cos(rad), y: Math.sin(rad) };
  }

  return { dvx: dir.x * magnitude, dvy: dir.y * magnitude };
}

// Compute delta-v to circularize orbit around a body at the current distance
// Returns {dvx, dvy} in inertial frame
// sensePref: 0=auto (match current orbit sense), 1=prograde (CCW), -1=retrograde (CW)
export function circularizeDeltaV(craftState, bodyId, epoch, sensePref = 0) {
  const body = BODY_MAP[bodyId];
  if (!body) return { dvx: 0, dvy: 0 };

  const bodyPos = getBodyPosition(bodyId, epoch);
  const bodyVel = getBodyVelocity(bodyId, epoch);

  // Relative position and velocity
  const relPos = sub(craftState, bodyPos);
  const relVel = { x: craftState.vx - bodyVel.x, y: craftState.vy - bodyVel.y };

  const r = mag(relPos);
  if (r < 1) return { dvx: 0, dvy: 0 };

  // Circular orbit speed at this distance
  const vCirc = Math.sqrt(G * body.mass / r);

  // Determine orbit sense
  const sign = sensePref !== 0
    ? sensePref  // forced: 1=CCW, -1=CW
    : (cross2d(relPos, relVel) >= 0 ? 1 : -1);  // auto: match current orbit

  // Tangential direction (perpendicular to radial, matching orbit sense)
  const radDir = normalize(relPos);
  const tanDir = { x: -radDir.y * sign, y: radDir.x * sign };

  // Target velocity in inertial frame
  const targetVx = bodyVel.x + tanDir.x * vCirc;
  const targetVy = bodyVel.y + tanDir.y * vCirc;

  return {
    dvx: targetVx - craftState.vx,
    dvy: targetVy - craftState.vy,
  };
}

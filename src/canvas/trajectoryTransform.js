import { BODY_MAP } from '../constants/bodies.js';
import { getBodyPosition } from '../physics/bodyPosition.js';

// Create a transform function for trajectory points.
// Returns (x, y, t) => {x, y} that maps inertial coords to the chosen frame.
export function createTrajectoryTransform(trackBodyId, currentEpoch, mode) {
  if (mode === 'inertial') return null;

  const body = BODY_MAP[trackBodyId];
  if (!body || body.id === 'sun') return null;

  if (mode === 'comoving') {
    const bodyNow = getBodyPosition(trackBodyId, currentEpoch);
    return (x, y, t) => {
      const bodyAtT = getBodyPosition(trackBodyId, t);
      return {
        x: x - bodyAtT.x + bodyNow.x,
        y: y - bodyAtT.y + bodyNow.y,
      };
    };
  }

  if (mode === 'corotating') {
    if (!body.parent) return null;
    const parentNow = getBodyPosition(body.parent, currentEpoch);
    const w = body.angularVelocity;
    const fn = (x, y, t) => {
      const parentAtT = getBodyPosition(body.parent, t);
      const rx = x - parentAtT.x;
      const ry = y - parentAtT.y;
      const dAngle = w * (currentEpoch - t);
      const cos = Math.cos(dAngle), sin = Math.sin(dAngle);
      return {
        x: parentNow.x + rx * cos - ry * sin,
        y: parentNow.y + rx * sin + ry * cos,
      };
    };
    // Expose rotation angle for impulse vector rotation
    fn.rotAngle = (t) => w * (currentEpoch - t);
    return fn;
  }

  return null;
}

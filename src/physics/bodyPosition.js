import BODIES, { BODY_MAP } from '../constants/bodies.js';

// Get the position of a single body at time t (seconds since J2000)
// Returns {x, y} in meters, Sun at origin
export function getBodyPosition(bodyId, t) {
  const body = BODY_MAP[bodyId];
  if (!body) throw new Error(`Unknown body: ${bodyId}`);

  if (body.id === 'sun') {
    return { x: 0, y: 0 };
  }

  // Angle at time t
  const angle = body.initialAngle + body.angularVelocity * t;
  const localX = body.orbitalRadius * Math.cos(angle);
  const localY = body.orbitalRadius * Math.sin(angle);

  if (body.parent === 'sun') {
    // Planet orbits the Sun directly
    return { x: localX, y: localY };
  }

  // Moon: offset from parent body position
  const parentPos = getBodyPosition(body.parent, t);
  return { x: parentPos.x + localX, y: parentPos.y + localY };
}

// Get positions of all bodies at time t
// Returns a Map: bodyId -> {x, y}
export function getAllBodyPositions(t) {
  const positions = {};

  // Compute parent positions first (Sun, then planets), then moons
  for (const body of BODIES) {
    if (body.id === 'sun') {
      positions[body.id] = { x: 0, y: 0 };
      continue;
    }

    const angle = body.initialAngle + body.angularVelocity * t;
    const localX = body.orbitalRadius * Math.cos(angle);
    const localY = body.orbitalRadius * Math.sin(angle);

    if (body.parent === 'sun') {
      positions[body.id] = { x: localX, y: localY };
    } else {
      const parentPos = positions[body.parent];
      positions[body.id] = { x: parentPos.x + localX, y: parentPos.y + localY };
    }
  }

  return positions;
}

// Get the orbital velocity vector of a body at time t
// For circular orbits, velocity is perpendicular to the radius vector
export function getBodyVelocity(bodyId, t) {
  const body = BODY_MAP[bodyId];
  if (!body || body.id === 'sun') {
    return { x: 0, y: 0 };
  }

  const angle = body.initialAngle + body.angularVelocity * t;
  const speed = body.orbitalRadius * Math.abs(body.angularVelocity);
  const sign = body.angularVelocity >= 0 ? 1 : -1;

  // Velocity is perpendicular to position: d/dt(R*cos(θ), R*sin(θ)) = R*ω*(-sin(θ), cos(θ))
  const localVx = -speed * Math.sin(angle) * sign;
  const localVy = speed * Math.cos(angle) * sign;

  if (body.parent === 'sun') {
    return { x: localVx, y: localVy };
  }

  // Moon: add parent velocity
  const parentVel = getBodyVelocity(body.parent, t);
  return { x: parentVel.x + localVx, y: parentVel.y + localVy };
}

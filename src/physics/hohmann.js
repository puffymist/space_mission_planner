import { G } from '../constants/physics.js';
import { BODY_MAP } from '../constants/bodies.js';

// Hohmann transfer between two bodies orbiting the same parent
// Returns { dv1, dv2, transferTime, semiMajorAxis, requiredPhase, totalDv }
export function hohmannTransfer(departId, arriveId) {
  const depart = BODY_MAP[departId];
  const arrive = BODY_MAP[arriveId];
  if (!depart || !arrive) return null;

  // Both must orbit the same parent
  if (depart.parent !== arrive.parent) return null;
  const parentId = depart.parent;
  const parent = BODY_MAP[parentId];
  if (!parent) return null;

  const mu = G * parent.mass; // gravitational parameter of parent
  const r1 = depart.orbitalRadius;
  const r2 = arrive.orbitalRadius;

  if (r1 === 0 || r2 === 0) return null;

  // Transfer orbit semi-major axis
  const aT = (r1 + r2) / 2;

  // Transfer time (half of transfer orbit period)
  const transferTime = Math.PI * Math.sqrt(aT * aT * aT / mu);

  // Circular velocities
  const v1circ = Math.sqrt(mu / r1);
  const v2circ = Math.sqrt(mu / r2);

  // Transfer orbit velocities at departure and arrival
  const v1transfer = Math.sqrt(mu * (2 / r1 - 1 / aT));
  const v2transfer = Math.sqrt(mu * (2 / r2 - 1 / aT));

  // Delta-v magnitudes (signed: positive = speed up)
  let dv1, dv2;
  if (r2 > r1) {
    // Transfer outward
    dv1 = v1transfer - v1circ;   // speed up at departure
    dv2 = v2circ - v2transfer;   // speed up at arrival (arrival is slower than circular)
  } else {
    // Transfer inward
    dv1 = v1circ - v1transfer;   // slow down at departure (negative prograde = retrograde)
    dv1 = -dv1;                  // make it negative to indicate retrograde
    dv2 = v2transfer - v2circ;   // slow down at arrival
    dv2 = -dv2;                  // retrograde
  }

  // Required phase angle of target relative to departure at launch
  // Phase = angle(arrive) - angle(depart) at launch time
  const arriveAngVel = arrive.angularVelocity;
  const requiredPhase = Math.PI - arriveAngVel * transferTime;

  // Normalize to [0, 2π)
  const normPhase = ((requiredPhase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  return {
    departId,
    arriveId,
    parentId,
    r1,
    r2,
    mu,
    dv1,             // m/s (positive = prograde, negative = retrograde)
    dv2,             // m/s
    totalDv: Math.abs(dv1) + Math.abs(dv2),
    transferTime,    // seconds
    semiMajorAxis: aT,
    requiredPhase: normPhase,  // radians
  };
}

// Bi-elliptic transfer: three burns via an intermediate radius
export function biellipticTransfer(departId, arriveId, rIntermediate) {
  const depart = BODY_MAP[departId];
  const arrive = BODY_MAP[arriveId];
  if (!depart || !arrive) return null;
  if (depart.parent !== arrive.parent) return null;

  const parent = BODY_MAP[depart.parent];
  if (!parent) return null;

  const mu = G * parent.mass;
  const r1 = depart.orbitalRadius;
  const r2 = arrive.orbitalRadius;
  const rM = rIntermediate;

  if (r1 === 0 || r2 === 0 || rM === 0) return null;

  // First transfer ellipse: r1 to rM
  const a1 = (r1 + rM) / 2;
  // Second transfer ellipse: rM to r2
  const a2 = (rM + r2) / 2;

  // Transfer times
  const t1 = Math.PI * Math.sqrt(a1 * a1 * a1 / mu);
  const t2 = Math.PI * Math.sqrt(a2 * a2 * a2 / mu);
  const transferTime = t1 + t2;

  // Velocities
  const v1circ = Math.sqrt(mu / r1);
  const v2circ = Math.sqrt(mu / r2);

  const v1depart = Math.sqrt(mu * (2 / r1 - 1 / a1));
  const vM_arrive1 = Math.sqrt(mu * (2 / rM - 1 / a1));
  const vM_depart2 = Math.sqrt(mu * (2 / rM - 1 / a2));
  const v2arrive = Math.sqrt(mu * (2 / r2 - 1 / a2));

  // Delta-v's
  const dv1 = v1depart - v1circ;
  const dv2 = Math.abs(vM_depart2 - vM_arrive1); // at intermediate
  const dv3 = Math.abs(v2circ - v2arrive);

  // Phase angle at launch
  const arriveAngVel = arrive.angularVelocity;
  const requiredPhase = Math.PI - arriveAngVel * transferTime;
  const normPhase = ((requiredPhase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  return {
    departId,
    arriveId,
    parentId: depart.parent,
    r1,
    r2,
    rM,
    mu,
    dv1,
    dv2,
    dv3,
    totalDv: Math.abs(dv1) + dv2 + dv3,
    transferTime,
    t1,
    t2,
    semiMajorAxis1: a1,
    semiMajorAxis2: a2,
    requiredPhase: normPhase,
  };
}

// Find the next launch window (epoch) for a Hohmann transfer
// starting from the given epoch
export function findNextWindow(departId, arriveId, fromEpoch, requiredPhase) {
  const depart = BODY_MAP[departId];
  const arrive = BODY_MAP[arriveId];
  if (!depart || !arrive) return fromEpoch;

  // Current phase angle: arrive_angle - depart_angle
  const departAngle = depart.initialAngle + depart.angularVelocity * fromEpoch;
  const arriveAngle = arrive.initialAngle + arrive.angularVelocity * fromEpoch;
  let currentPhase = ((arriveAngle - departAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

  // Rate of phase angle change
  const dPhaseRate = arrive.angularVelocity - depart.angularVelocity;
  if (Math.abs(dPhaseRate) < 1e-20) return fromEpoch; // same period, always aligned

  // Phase deficit
  let dPhase = requiredPhase - currentPhase;

  // We need dPhase / dPhaseRate > 0 (positive time offset)
  // Adjust by adding/subtracting 2π until we get the smallest positive dt
  if (dPhaseRate > 0) {
    // Phase increases with time
    while (dPhase < 0) dPhase += 2 * Math.PI;
  } else {
    // Phase decreases with time
    while (dPhase > 0) dPhase -= 2 * Math.PI;
  }

  const dt = dPhase / dPhaseRate;
  return fromEpoch + dt;
}

// Compute preview points for a Hohmann transfer ellipse
// Returns array of {x, y} points in world coordinates
export function hohmannPreviewPoints(transfer, launchEpoch, numPoints = 100) {
  const depart = BODY_MAP[transfer.departId];
  const parent = BODY_MAP[transfer.parentId];
  if (!depart || !parent) return [];

  const { r1, r2, semiMajorAxis } = transfer;

  // Departure position angle
  const departAngle = depart.initialAngle + depart.angularVelocity * launchEpoch;

  // Parent position (for moons, this would be the planet, but we handle sun-orbiting case)
  // For simplicity, assume parent is at origin (works for sun)
  // For moons, we'd need to offset by grandparent position, but transfers are typically between
  // bodies orbiting the same parent, so the parent is the center of the coordinate system for the transfer

  // Transfer ellipse: periapsis at min(r1,r2), apoapsis at max(r1,r2)
  // Semi-major axis = a, eccentricity e = |r2-r1|/(r1+r2)
  const rMin = Math.min(r1, r2);
  const rMax = Math.max(r1, r2);
  const e = (rMax - rMin) / (rMax + rMin);
  const a = semiMajorAxis;

  // The departure is at either periapsis (outward) or apoapsis (inward)
  // For outward (r2 > r1): depart at periapsis, arrive at apoapsis
  // For inward (r1 > r2): depart at apoapsis, arrive at periapsis
  const outward = r2 > r1;

  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    // True anomaly from 0 to π (half orbit = the transfer)
    const nu = (i / numPoints) * Math.PI;
    const r = a * (1 - e * e) / (1 + e * Math.cos(nu));

    // Angle in inertial frame
    // If outward: periapsis is at departAngle, so angle = departAngle + nu
    // If inward: apoapsis is at departAngle (nu=π at depart), so angle = departAngle - (π - nu)
    let angle;
    if (outward) {
      angle = departAngle + nu;
    } else {
      angle = departAngle - (Math.PI - nu);
    }

    points.push({
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
    });
  }

  return points;
}

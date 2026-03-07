import { integrateSegment } from './integrator.js';
import { getAllBodyPositions, getBodyPosition, getBodyVelocity } from './bodyPosition.js';
import { nearestBody } from './gravity.js';

const ONE_YEAR = 365.25 * 86400;
const TEN_YEARS = 10 * ONE_YEAR;
const MAX_COAST_ORBITS = 2;

self.onmessage = function (e) {
  const { type, craft, duration, firstChunkDuration } = e.data;

  if (type === 'abort') {
    self.close();
    return;
  }

  if (type !== 'compute') return;

  const events = [...craft.events].sort((a, b) => a.epoch - b.epoch);
  const tEnd = craft.launchEpoch + (duration || 100 * ONE_YEAR);

  let x = craft.initialState.x;
  let y = craft.initialState.y;
  let vx = craft.initialState.vx;
  let vy = craft.initialState.vy;
  let t = craft.launchEpoch;
  let eventIdx = 0;
  const allSegments = [];

  // --- Orbit closure detection state ---
  let pastAllEvents = false;
  let closureRef = null; // { relX, relY, relVx, relVy, bodyId, maxDist, coastStart }
  let orbitCount = 0;
  let closedOrbit = false;
  const closureIndices = [];
  let coastPointCount = 0;
  let coastSegStart = 0;

  // Process in chunks: first chunk can be shorter for faster initial feedback
  let isFirstChunk = true;
  while (t < tEnd) {
    const chunkSize = (isFirstChunk && firstChunkDuration) ? firstChunkDuration : ONE_YEAR;
    isFirstChunk = false;
    const chunkEnd = Math.min(t + chunkSize, tEnd);

    // Process events within this chunk
    while (eventIdx < events.length && events[eventIdx].epoch <= chunkEnd) {
      const ev = events[eventIdx];
      if (ev.epoch > t) {
        const pts = integrateSegment(x, y, vx, vy, t, ev.epoch);
        allSegments.push(pts);
        const last = pts[pts.length - 1];
        x = last.x;
        y = last.y;
        vx = last.vx + ev.dvx;
        vy = last.vy + ev.dvy;
        t = ev.epoch;
      }
      eventIdx++;
    }

    // Check if we just passed all events
    if (!pastAllEvents && eventIdx >= events.length) {
      pastAllEvents = true;
      coastSegStart = allSegments.length;

      // Find dominant body and record relative state
      const bodyPositions = getAllBodyPositions(t);
      const { bodyId } = nearestBody({ x, y }, bodyPositions);
      const bodyPos = bodyPositions[bodyId];
      const bodyVel = getBodyVelocity(bodyId, t);

      closureRef = {
        relX: x - bodyPos.x,
        relY: y - bodyPos.y,
        relVx: vx - bodyVel.x,
        relVy: vy - bodyVel.y,
        bodyId,
        maxDist: 0,
        coastStart: t,
      };
    }

    // Integrate remaining chunk
    if (t < chunkEnd) {
      const pts = integrateSegment(x, y, vx, vy, t, chunkEnd);
      allSegments.push(pts);
      const last = pts[pts.length - 1];
      x = last.x;
      y = last.y;
      vx = last.vx;
      vy = last.vy;
      t = chunkEnd;

      // --- Orbit closure check: scan recorded points within this segment ---
      if (pastAllEvents && closureRef && !closedOrbit) {
        const refRelSpeed = Math.sqrt(
          closureRef.relVx * closureRef.relVx + closureRef.relVy * closureRef.relVy
        );

        // Sample points at intervals (checking every point in a dense segment is expensive)
        const step = Math.max(1, Math.floor(pts.length / 200));
        for (let i = 0; i < pts.length; i += step) {
          const pt = pts[i];

          // Get dominant body position/velocity at this point's time
          const bPos = getBodyPosition(closureRef.bodyId, pt.t);
          const bVel = getBodyVelocity(closureRef.bodyId, pt.t);

          // Relative state
          const relX = pt.x - bPos.x;
          const relY = pt.y - bPos.y;
          const relVx = pt.vx - bVel.x;
          const relVy = pt.vy - bVel.y;

          const dx = relX - closureRef.relX;
          const dy = relY - closureRef.relY;
          const posDist = Math.sqrt(dx * dx + dy * dy);

          if (posDist > closureRef.maxDist) closureRef.maxDist = posDist;

          // Check closure once we've moved significantly away
          if (closureRef.maxDist > 1e6 && posDist < closureRef.maxDist * 0.02) {
            const dvx = relVx - closureRef.relVx;
            const dvy = relVy - closureRef.relVy;
            const velDist = Math.sqrt(dvx * dvx + dvy * dvy);

            if (velDist < refRelSpeed * 0.02) {
              orbitCount++;
              closureIndices.push(coastPointCount + i);

              if (orbitCount >= MAX_COAST_ORBITS) {
                closedOrbit = true;
                const trimmedPts = pts.slice(0, i + 1);
                allSegments[allSegments.length - 1] = trimmedPts;
                coastPointCount += i + 1;

                self.postMessage({
                  type: 'done',
                  craftId: craft.id,
                  segments: allSegments,
                  closedOrbit: true,
                  closureIndices,
                  coastSegStart,
                });
                return;
              }
            }
          }
        }
        coastPointCount += pts.length;

        // Cap escape trajectories at 10 years post-last-maneuver
        if (t - closureRef.coastStart > TEN_YEARS) {
          self.postMessage({
            type: 'done',
            craftId: craft.id,
            segments: allSegments,
            closedOrbit: false,
            closureIndices,
            coastSegStart,
          });
          return;
        }
      }
    }

    // Post progress
    self.postMessage({
      type: 'progress',
      craftId: craft.id,
      segments: allSegments.map(s => s),
    });
  }

  self.postMessage({
    type: 'done',
    craftId: craft.id,
    segments: allSegments,
    closedOrbit: false,
    closureIndices,
    coastSegStart: coastSegStart || 0,
  });
};

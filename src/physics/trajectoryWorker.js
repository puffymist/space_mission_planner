import { integrateSegment } from './integrator.js';
import { getAllBodyPositions, getBodyPosition, getBodyVelocity } from './bodyPosition.js';
import { nearestBody } from './gravity.js';
import { BODY_MAP } from '../constants/bodies.js';

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

  // --- Orbit closure detection state (angular-travel based) ---
  let pastAllEvents = false;
  let closureRef = null; // { trackBody, prevAngle, totalAngle, coastStart, soiCheckCounter }
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
      } else if (ev.epoch === t) {
        // Event at current time: apply delta-v immediately, no integration needed
        vx += ev.dvx;
        vy += ev.dvy;
      }
      eventIdx++;
    }

    // Check if we just passed all events
    if (!pastAllEvents && eventIdx >= events.length) {
      pastAllEvents = true;
      coastSegStart = allSegments.length;

      // Find tracking body for angular closure detection
      const bodyPositions = getAllBodyPositions(t);
      const { bodyId } = nearestBody({ x, y }, bodyPositions);
      const bodyPos = bodyPositions[bodyId];

      closureRef = {
        trackBody: bodyId,
        prevAngle: Math.atan2(y - bodyPos.y, x - bodyPos.x),
        totalAngle: 0,
        coastStart: t,
        soiCheckCounter: 0,
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

      // --- Orbit closure check: angular-travel based with hierarchy-aware SOI ---
      if (pastAllEvents && closureRef && !closedOrbit) {
        const step = Math.max(1, Math.floor(pts.length / 200));
        for (let i = 0; i < pts.length; i += step) {
          const pt = pts[i];

          // Get tracking body position at this time
          const bPos = getBodyPosition(closureRef.trackBody, pt.t);
          const relX = pt.x - bPos.x;
          const relY = pt.y - bPos.y;
          const angle = Math.atan2(relY, relX);

          // Accumulate angular displacement (handle ±π wraparound)
          let dAngle = angle - closureRef.prevAngle;
          if (dAngle > Math.PI) dAngle -= 2 * Math.PI;
          if (dAngle < -Math.PI) dAngle += 2 * Math.PI;
          closureRef.totalAngle += dAngle;
          closureRef.prevAngle = angle;

          // Periodically check for SOI transition (every ~10 samples)
          closureRef.soiCheckCounter++;
          if (closureRef.soiCheckCounter >= 10) {
            closureRef.soiCheckCounter = 0;
            const bodyPositions = getAllBodyPositions(pt.t);
            const { bodyId: nearest } = nearestBody(pt, bodyPositions);
            if (nearest !== closureRef.trackBody) {
              // Hierarchy rule: if nearest is a child of tracking body, ignore
              const nearestInfo = BODY_MAP[nearest];
              if (!nearestInfo || nearestInfo.parent !== closureRef.trackBody) {
                // Real SOI transition — switch tracking body, reset angle
                closureRef.trackBody = nearest;
                const newPos = bodyPositions[nearest];
                closureRef.prevAngle = Math.atan2(pt.y - newPos.y, pt.x - newPos.x);
                closureRef.totalAngle = 0;
                orbitCount = 0;
                closureIndices.length = 0;
              }
            }
          }

          // Check for orbit completion (each 2π of angular travel)
          const completedOrbits = Math.floor(Math.abs(closureRef.totalAngle) / (2 * Math.PI));
          if (completedOrbits > orbitCount) {
            orbitCount = completedOrbits;
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

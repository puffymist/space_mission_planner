import { integrateSegment } from './integrator.js';

const ONE_YEAR = 365.25 * 86400;

self.onmessage = function (e) {
  const { type, craft, duration } = e.data;

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

  // Process in 1-year chunks
  while (t < tEnd) {
    const chunkEnd = Math.min(t + ONE_YEAR, tEnd);

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
    }

    // Post progress with a shallow copy of segments array
    self.postMessage({
      type: 'progress',
      craftId: craft.id,
      segments: allSegments.map(s => s),
    });
  }

  // Post completion
  self.postMessage({
    type: 'done',
    craftId: craft.id,
    segments: allSegments,
  });
};

// Binary search for the segment and index containing epoch t
// segments: array of arrays of {t, x, y, vx, vy} points
// Returns {segIndex, pointIndex, frac} or null if out of range
export function findEpochInSegments(segments, t) {
  if (!segments || segments.length === 0) return null;

  // Find which segment contains t
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    if (seg.length === 0) continue;
    const segStart = seg[0].t;
    const segEnd = seg[seg.length - 1].t;

    if (t < segStart - 0.5) continue;
    if (t > segEnd + 0.5 && si < segments.length - 1) continue;

    // Binary search within this segment
    let lo = 0, hi = seg.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (seg[mid].t <= t) lo = mid;
      else hi = mid;
    }

    const dt = seg[hi].t - seg[lo].t;
    const frac = dt > 0 ? (t - seg[lo].t) / dt : 0;

    return { segIndex: si, pointIndex: lo, frac: Math.max(0, Math.min(1, frac)) };
  }

  return null;
}

// Interpolate position and velocity at epoch t
export function interpolateState(segments, t) {
  const loc = findEpochInSegments(segments, t);
  if (!loc) return null;

  const seg = segments[loc.segIndex];
  const a = seg[loc.pointIndex];
  const b = seg[Math.min(loc.pointIndex + 1, seg.length - 1)];
  const f = loc.frac;

  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    vx: a.vx + (b.vx - a.vx) * f,
    vy: a.vy + (b.vy - a.vy) * f,
    t: a.t + (b.t - a.t) * f,
  };
}

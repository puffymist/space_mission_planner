import { worldToScreen } from './camera.js';

// Draw segment lines between startIdx and endIdx
function drawSegmentRange(ctx, camera, canvas, seg, startIdx, endIdx, transform) {
  ctx.beginPath();
  let started = false;

  for (let i = startIdx; i < endIdx; i++) {
    const pt = seg[i];
    const pos = transform ? transform(pt.x, pt.y, pt.t) : pt;
    const screen = worldToScreen(pos.x, pos.y, camera, canvas);

    if (screen.x < -500 || screen.x > canvas.width + 500 ||
        screen.y < -500 || screen.y > canvas.height + 500) {
      if (started) {
        ctx.stroke();
        ctx.beginPath();
        started = false;
      }
      continue;
    }

    if (!started) {
      ctx.moveTo(screen.x, screen.y);
      started = true;
    } else {
      ctx.lineTo(screen.x, screen.y);
    }
  }

  if (started) ctx.stroke();
}

// Draw all trajectory segments for a spacecraft
export function drawTrajectory(ctx, camera, canvas, segments, color, currentEpoch, epochStep, craft, transform) {
  if (!segments || segments.length === 0) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  // Determine orbit closure fading boundaries
  const hasClosedOrbit = craft && craft.closedOrbit && craft.closureIndices && craft.closureIndices.length > 0;
  const coastStart = hasClosedOrbit ? (craft.coastSegStart || 0) : segments.length;
  const firstOrbitPts = hasClosedOrbit ? craft.closureIndices[0] : Infinity;

  // Draw segments with proper alpha splitting for closed orbits
  let coastCumPts = 0;
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    if (seg.length < 2) continue;

    if (!hasClosedOrbit || si < coastStart) {
      // Pre-coast or no closure: draw at full alpha
      ctx.globalAlpha = 0.8;
      drawSegmentRange(ctx, camera, canvas, seg, 0, seg.length, transform);
    } else {
      // Coasting segment — split at first orbit boundary
      const segStart = coastCumPts;
      const segEnd = coastCumPts + seg.length;

      if (firstOrbitPts > segStart && firstOrbitPts <= segEnd) {
        // Boundary falls within this segment
        const localBoundary = firstOrbitPts - segStart;
        ctx.globalAlpha = 0.8;
        drawSegmentRange(ctx, camera, canvas, seg, 0, localBoundary, transform);
        ctx.globalAlpha = 0.15;
        drawSegmentRange(ctx, camera, canvas, seg, localBoundary, seg.length, transform);
      } else if (segEnd <= firstOrbitPts) {
        // Entire segment is in the first orbit
        ctx.globalAlpha = 0.8;
        drawSegmentRange(ctx, camera, canvas, seg, 0, seg.length, transform);
      } else {
        // Entire segment is in the second orbit
        ctx.globalAlpha = 0.15;
        drawSegmentRange(ctx, camera, canvas, seg, 0, seg.length, transform);
      }

      coastCumPts = segEnd;
    }
  }

  ctx.globalAlpha = 1.0;

  // Position interval markers along trajectory
  if (epochStep && segments.length > 0) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    let lastScreenX = -Infinity, lastScreenY = -Infinity;

    // Determine the epoch cutoff for markers (skip faded region)
    let markerCutoffT = Infinity;
    if (hasClosedOrbit) {
      // Find the time at the first orbit closure point
      let cumPts = 0;
      for (let si = coastStart; si < segments.length; si++) {
        const seg = segments[si];
        const segEnd = cumPts + seg.length;
        if (firstOrbitPts <= segEnd) {
          const localIdx = Math.min(firstOrbitPts - cumPts, seg.length - 1);
          markerCutoffT = seg[localIdx].t;
          break;
        }
        cumPts = segEnd;
      }
    }

    for (const seg of segments) {
      if (seg.length < 2) continue;
      const tStart = seg[0].t;
      let t = Math.ceil(tStart / epochStep) * epochStep;
      let idx = 0;
      while (t <= seg[seg.length - 1].t && t < markerCutoffT) {
        while (idx < seg.length - 1 && seg[idx + 1].t < t) idx++;
        if (idx >= seg.length - 1) break;

        const p0 = seg[idx];
        const p1 = seg[idx + 1];
        const frac = (t - p0.t) / (p1.t - p0.t);
        let x = p0.x + frac * (p1.x - p0.x);
        let y = p0.y + frac * (p1.y - p0.y);

        if (transform) {
          const tp = transform(x, y, t);
          x = tp.x; y = tp.y;
        }
        const scr = worldToScreen(x, y, camera, canvas);
        const dsx = scr.x - lastScreenX;
        const dsy = scr.y - lastScreenY;
        if (dsx * dsx + dsy * dsy > 9) {
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
          lastScreenX = scr.x;
          lastScreenY = scr.y;
        }

        t += epochStep;
      }
    }
    ctx.globalAlpha = 1.0;
  }
}

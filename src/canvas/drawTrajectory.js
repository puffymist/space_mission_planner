import { worldToScreen } from './camera.js';

// Draw all trajectory segments for a spacecraft
export function drawTrajectory(ctx, camera, canvas, segments, color, currentEpoch, epochStep) {
  if (!segments || segments.length === 0) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.8;

  for (const seg of segments) {
    if (seg.length < 2) continue;

    ctx.beginPath();
    let started = false;

    for (let i = 0; i < seg.length; i++) {
      const pt = seg[i];
      const screen = worldToScreen(pt.x, pt.y, camera, canvas);

      // Skip points far off screen
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

  ctx.globalAlpha = 1.0;

  // Position interval markers along trajectory
  if (epochStep && segments.length > 0) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    let lastScreenX = -Infinity, lastScreenY = -Infinity;
    for (const seg of segments) {
      if (seg.length < 2) continue;
      const tStart = seg[0].t;
      // Find the first marker time aligned to epochStep
      let t = Math.ceil(tStart / epochStep) * epochStep;
      let idx = 0;
      while (t <= seg[seg.length - 1].t) {
        // Advance idx to bracket t
        while (idx < seg.length - 1 && seg[idx + 1].t < t) idx++;
        if (idx >= seg.length - 1) break;

        // Linear interpolation
        const p0 = seg[idx];
        const p1 = seg[idx + 1];
        const frac = (t - p0.t) / (p1.t - p0.t);
        const x = p0.x + frac * (p1.x - p0.x);
        const y = p0.y + frac * (p1.y - p0.y);

        const scr = worldToScreen(x, y, camera, canvas);
        // Only draw if not too close to last marker (> 3px apart)
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

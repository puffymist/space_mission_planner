import { worldToScreen } from './camera.js';

// Draw all trajectory segments for a spacecraft
export function drawTrajectory(ctx, camera, canvas, segments, color, currentEpoch) {
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
}

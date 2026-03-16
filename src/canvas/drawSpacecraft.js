import { worldToScreen } from './camera.js';
import { interpolateState } from '../utils/interpolate.js';
import { formatVelocity } from '../utils/time.js';

// Draw a spacecraft at its current position
export function drawSpacecraft(ctx, camera, canvas, craft, epoch, transform) {
  if (!craft.segments) return;

  const state = interpolateState(craft.segments, epoch);
  if (!state) return;

  const pos = transform ? transform(state.x, state.y, epoch) : state;
  const screen = worldToScreen(pos.x, pos.y, camera, canvas);

  // Skip if off screen
  if (screen.x < -50 || screen.x > canvas.width + 50 ||
      screen.y < -50 || screen.y > canvas.height + 50) return;

  // Draw spacecraft as a small diamond
  const s = 5;
  ctx.beginPath();
  ctx.moveTo(screen.x, screen.y - s);
  ctx.lineTo(screen.x + s, screen.y);
  ctx.lineTo(screen.x, screen.y + s);
  ctx.lineTo(screen.x - s, screen.y);
  ctx.closePath();
  ctx.fillStyle = craft.color;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Label
  ctx.fillStyle = craft.color;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(craft.name, screen.x, screen.y - 10);

  // Draw maneuver nodes with impulse vectors
  for (const ev of craft.events) {
    const evState = interpolateState(craft.segments, ev.epoch);
    if (!evState) continue;
    const evPos = transform ? transform(evState.x, evState.y, ev.epoch) : evState;
    const evScreen = worldToScreen(evPos.x, evPos.y, camera, canvas);

    // Small X marker
    const m = 4;
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(evScreen.x - m, evScreen.y - m);
    ctx.lineTo(evScreen.x + m, evScreen.y + m);
    ctx.moveTo(evScreen.x + m, evScreen.y - m);
    ctx.lineTo(evScreen.x - m, evScreen.y + m);
    ctx.stroke();

    // Impulse vector arrow
    const dvMag = Math.sqrt(ev.dvx * ev.dvx + ev.dvy * ev.dvy);
    if (dvMag > 0) {
      // Arrow length: log-scaled, clamped
      const arrowLen = Math.min(60, Math.max(15, 10 * Math.log10(dvMag + 1)));
      // Rotate dv vector if transform is corotating (camera rotatingCtx handles the rest)
      let dvx = ev.dvx, dvy = ev.dvy;
      if (transform && transform.rotAngle) {
        const ra = transform.rotAngle(ev.epoch);
        const c = Math.cos(ra), s = Math.sin(ra);
        dvx = ev.dvx * c - ev.dvy * s;
        dvy = ev.dvx * s + ev.dvy * c;
      }
      // Direction in screen coords (Y flipped)
      const dirX = dvx / dvMag;
      const dirY = -dvy / dvMag;
      const endX = evScreen.x + dirX * arrowLen;
      const endY = evScreen.y + dirY * arrowLen;

      // Arrow shaft
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(evScreen.x, evScreen.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Arrowhead
      const headLen = 5;
      const angle = Math.atan2(dirY, dirX);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - headLen * Math.cos(angle - 0.4), endY - headLen * Math.sin(angle - 0.4));
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - headLen * Math.cos(angle + 0.4), endY - headLen * Math.sin(angle + 0.4));
      ctx.stroke();

      // Delta-v label
      ctx.fillStyle = '#ff0';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(formatVelocity(dvMag), endX, endY - 6);
    }
  }
}

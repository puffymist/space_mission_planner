import { worldToScreen } from './camera.js';
import { interpolateState } from '../utils/interpolate.js';
import { formatVelocity } from '../utils/time.js';

// Draw a spacecraft at its current position
export function drawSpacecraft(ctx, camera, canvas, craft, epoch) {
  if (!craft.segments) return;

  const state = interpolateState(craft.segments, epoch);
  if (!state) return;

  const screen = worldToScreen(state.x, state.y, camera, canvas);

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
    const evScreen = worldToScreen(evState.x, evState.y, camera, canvas);

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
      // Direction in screen coords (Y flipped)
      const dirX = ev.dvx / dvMag;
      const dirY = -ev.dvy / dvMag;
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

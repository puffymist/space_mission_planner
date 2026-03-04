import { worldToScreen } from './camera.js';
import { interpolateState } from '../utils/interpolate.js';

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

  // Draw maneuver nodes
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
  }
}

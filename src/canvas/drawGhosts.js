import BODIES from '../constants/bodies.js';
import { BODY_VISUALS } from '../constants/colors.js';
import { worldToScreen } from './camera.js';
import { getAllBodyPositions } from '../physics/bodyPosition.js';
import { interpolateState } from '../utils/interpolate.js';

// Draw semi-transparent ghost positions of all bodies and spacecraft at a given epoch
export function drawGhosts(ctx, camera, canvas, ghostEpoch, crafts) {
  if (ghostEpoch === null) return;

  const positions = getAllBodyPositions(ghostEpoch);

  ctx.globalAlpha = 0.4;

  // Draw ghost bodies
  for (const body of BODIES) {
    const pos = positions[body.id];
    if (!pos) continue;

    const screen = worldToScreen(pos.x, pos.y, camera, canvas);
    if (screen.x < -50 || screen.x > canvas.width + 50) continue;
    if (screen.y < -50 || screen.y > canvas.height + 50) continue;

    const vis = BODY_VISUALS[body.id];

    // Ghost circle (dashed outline)
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, vis.radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = vis.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ghost fill
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, vis.radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = vis.color;
    ctx.fill();

    // Ghost label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(body.name, screen.x, screen.y - vis.labelOffset);
  }

  // Draw ghost spacecraft
  for (const craft of crafts) {
    if (!craft.segments) continue;
    const state = interpolateState(craft.segments, ghostEpoch);
    if (!state) continue;

    const screen = worldToScreen(state.x, state.y, camera, canvas);
    if (screen.x < -50 || screen.x > canvas.width + 50) continue;
    if (screen.y < -50 || screen.y > canvas.height + 50) continue;

    const s = 4;
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y - s);
    ctx.lineTo(screen.x + s, screen.y);
    ctx.lineTo(screen.x, screen.y + s);
    ctx.lineTo(screen.x - s, screen.y);
    ctx.closePath();
    ctx.strokeStyle = craft.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.globalAlpha = 1.0;
}

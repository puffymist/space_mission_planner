import BODIES from '../constants/bodies.js';
import { BODY_VISUALS } from '../constants/colors.js';
import { worldToScreen } from './camera.js';

export function drawBodies(ctx, camera, canvas, bodyPositions) {
  for (const body of BODIES) {
    const pos = bodyPositions[body.id];
    if (!pos) continue;

    const screen = worldToScreen(pos.x, pos.y, camera, canvas);

    // Skip if off screen (with some margin for labels)
    if (screen.x < -50 || screen.x > canvas.width + 50) continue;
    if (screen.y < -50 || screen.y > canvas.height + 50) continue;

    const vis = BODY_VISUALS[body.id];

    // Draw body circle (fixed pixel size)
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, vis.radius, 0, Math.PI * 2);
    ctx.fillStyle = vis.color;
    ctx.fill();

    // Draw label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = body.parent === 'sun' || body.id === 'sun' ? '11px sans-serif' : '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(body.name, screen.x, screen.y - vis.labelOffset);
  }
}

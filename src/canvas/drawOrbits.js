import BODIES, { BODY_MAP } from '../constants/bodies.js';
import { ORBIT_VISUALS } from '../constants/colors.js';
import { worldToScreen } from './camera.js';

export function drawOrbits(ctx, camera, canvas, bodyPositions) {
  for (const body of BODIES) {
    if (body.id === 'sun' || body.orbitalRadius === 0) continue;

    const vis = ORBIT_VISUALS[body.id];
    if (!vis || vis.width === 0) continue;

    // Orbit center is the parent body's position
    let centerX = 0, centerY = 0;
    if (body.parent === 'sun') {
      centerX = 0;
      centerY = 0;
    } else {
      const parentPos = bodyPositions[body.parent];
      centerX = parentPos.x;
      centerY = parentPos.y;
    }

    const center = worldToScreen(centerX, centerY, camera, canvas);
    const radiusPx = body.orbitalRadius * camera.zoom;

    // Skip if orbit is too small to see or way off screen
    if (radiusPx < 1) continue;
    if (center.x + radiusPx < -100 || center.x - radiusPx > canvas.width + 100) continue;
    if (center.y + radiusPx < -100 || center.y - radiusPx > canvas.height + 100) continue;

    ctx.beginPath();
    ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
    ctx.strokeStyle = vis.color;
    ctx.lineWidth = vis.width;
    ctx.stroke();
  }
}

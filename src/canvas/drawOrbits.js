import BODIES, { BODY_MAP } from '../constants/bodies.js';
import { ORBIT_VISUALS } from '../constants/colors.js';
import { worldToScreen } from './camera.js';

export function drawOrbits(ctx, camera, canvas, bodyPositions, epochStep) {
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

    // Position interval markers
    if (epochStep && body.angularVelocity !== 0) {
      const angularInterval = body.angularVelocity * epochStep;
      const markerCount = Math.abs(2 * Math.PI / angularInterval);
      // Skip if too many markers (would be too dense) or too few to be useful
      if (markerCount > 4 && markerCount < 200) {
        const tickLen = Math.min(6, Math.max(2, radiusPx * 0.03));
        ctx.strokeStyle = vis.color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < markerCount; i++) {
          const angle = i * angularInterval;
          const cx = center.x + radiusPx * Math.cos(angle);
          const cy = center.y - radiusPx * Math.sin(angle); // Y flipped
          const nx = Math.cos(angle);
          const ny = -Math.sin(angle);
          ctx.beginPath();
          ctx.moveTo(cx - nx * tickLen, cy - ny * tickLen);
          ctx.lineTo(cx + nx * tickLen, cy + ny * tickLen);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      }
    }
  }
}

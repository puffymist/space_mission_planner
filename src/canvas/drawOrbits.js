import BODIES, { BODY_MAP } from '../constants/bodies.js';
import { ORBIT_VISUALS } from '../constants/colors.js';
import { worldToScreen } from './camera.js';

export function drawOrbits(ctx, camera, canvas, bodyPositions, epochStep) {
  const rotating = !!camera.rotatingCtx;

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

    ctx.strokeStyle = vis.color;
    ctx.lineWidth = vis.width;

    if (rotating) {
      // In rotating frame, orbits are not circles on screen — sample as polyline
      const N = 360;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * 2 * Math.PI;
        const wx = centerX + body.orbitalRadius * Math.cos(a);
        const wy = centerY + body.orbitalRadius * Math.sin(a);
        const scr = worldToScreen(wx, wy, camera, canvas);
        if (scr.x < -500 || scr.x > canvas.width + 500 ||
            scr.y < -500 || scr.y > canvas.height + 500) {
          if (started) { ctx.stroke(); ctx.beginPath(); started = false; }
          continue;
        }
        if (!started) { ctx.moveTo(scr.x, scr.y); started = true; }
        else ctx.lineTo(scr.x, scr.y);
      }
      if (started) ctx.stroke();
    } else {
      const center = worldToScreen(centerX, centerY, camera, canvas);
      const radiusPx = body.orbitalRadius * camera.zoom;

      // Skip if orbit is too small to see or way off screen
      if (radiusPx < 1) continue;
      if (center.x + radiusPx < -100 || center.x - radiusPx > canvas.width + 100) continue;
      if (center.y + radiusPx < -100 || center.y - radiusPx > canvas.height + 100) continue;

      ctx.beginPath();
      ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Position interval markers
    if (epochStep && body.angularVelocity !== 0) {
      const angularInterval = body.angularVelocity * epochStep;
      const markerCount = Math.abs(2 * Math.PI / angularInterval);
      if (markerCount > 4 && markerCount < 200) {
        ctx.strokeStyle = vis.color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.5;

        if (rotating) {
          // Compute marker world positions, project through worldToScreen
          const tickLenWorld = body.orbitalRadius * 0.03;
          const maxTickWorld = 6 / camera.zoom;
          const minTickWorld = 2 / camera.zoom;
          const tickWorld = Math.min(maxTickWorld, Math.max(minTickWorld, tickLenWorld));
          for (let i = 0; i < markerCount; i++) {
            const angle = i * angularInterval;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const wx = centerX + body.orbitalRadius * cos;
            const wy = centerY + body.orbitalRadius * sin;
            const inner = worldToScreen(wx - cos * tickWorld, wy - sin * tickWorld, camera, canvas);
            const outer = worldToScreen(wx + cos * tickWorld, wy + sin * tickWorld, camera, canvas);
            ctx.beginPath();
            ctx.moveTo(inner.x, inner.y);
            ctx.lineTo(outer.x, outer.y);
            ctx.stroke();
          }
        } else {
          const center = worldToScreen(centerX, centerY, camera, canvas);
          const radiusPx = body.orbitalRadius * camera.zoom;
          const tickLen = Math.min(6, Math.max(2, radiusPx * 0.03));
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
        }

        ctx.globalAlpha = 1.0;
      }
    }
  }
}

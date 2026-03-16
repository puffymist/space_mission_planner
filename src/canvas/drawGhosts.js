import BODIES from '../constants/bodies.js';
import { BODY_VISUALS } from '../constants/colors.js';
import { worldToScreen } from './camera.js';
import { getAllBodyPositions } from '../physics/bodyPosition.js';
import { interpolateState } from '../utils/interpolate.js';

// Draw semi-transparent ghost positions of all bodies and spacecraft at a given epoch
export function drawGhosts(ctx, camera, canvas, ghostEpoch, crafts, transform) {
  if (ghostEpoch === null) return;

  const positions = getAllBodyPositions(ghostEpoch);

  ctx.globalAlpha = 0.4;

  const drawnLabels = [];

  // Draw ghost bodies
  for (const body of BODIES) {
    const rawPos = positions[body.id];
    if (!rawPos) continue;
    const pos = transform ? transform(rawPos.x, rawPos.y, ghostEpoch) : rawPos;

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

    // Ghost label (with overlap detection)
    const fontSize = 9;
    ctx.font = `${fontSize}px sans-serif`;
    const tw = ctx.measureText(body.name).width;
    const lx = screen.x - tw / 2;
    const ly = screen.y - vis.labelOffset - fontSize;
    const lw = tw;
    const lh = fontSize + 2;

    let overlaps = false;
    for (const box of drawnLabels) {
      if (lx < box.x + box.w && lx + lw > box.x &&
          ly < box.y + box.h && ly + lh > box.y) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.textAlign = 'center';
      ctx.fillText(body.name, screen.x, screen.y - vis.labelOffset);
      drawnLabels.push({ x: lx, y: ly, w: lw, h: lh });
    }
  }

  // Draw ghost spacecraft
  for (const craft of crafts) {
    if (!craft.segments || craft.segments.length === 0) continue;
    const firstSeg = craft.segments[0];
    const lastSeg = craft.segments[craft.segments.length - 1];
    if (!firstSeg.length || !lastSeg.length) continue;
    const tMin = firstSeg[0].t;
    const tMax = lastSeg[lastSeg.length - 1].t;
    const clamped = ghostEpoch < tMin || ghostEpoch > tMax;
    const clampedEpoch = Math.max(tMin, Math.min(tMax, ghostEpoch));
    const state = interpolateState(craft.segments, clampedEpoch);
    if (!state) continue;
    if (clamped) ctx.globalAlpha = 0.2; // dimmer when at trajectory boundary

    const pos = transform ? transform(state.x, state.y, clampedEpoch) : state;
    const screen = worldToScreen(pos.x, pos.y, camera, canvas);
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
    if (clamped) ctx.globalAlpha = 0.4; // restore normal ghost alpha
  }

  ctx.globalAlpha = 1.0;
}

import BODIES from '../constants/bodies.js';
import { BODY_VISUALS } from '../constants/colors.js';
import { worldToScreen } from './camera.js';

export function drawBodies(ctx, camera, canvas, bodyPositions) {
  const drawnLabels = []; // {x, y, w, h} bounding boxes for overlap detection

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

    // Smart label: only draw if it doesn't overlap an already-drawn label
    const fontSize = body.parent === 'sun' || body.id === 'sun' ? 11 : 10;
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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'center';
      ctx.fillText(body.name, screen.x, screen.y - vis.labelOffset);
      drawnLabels.push({ x: lx, y: ly, w: lw, h: lh });
    }
  }
}

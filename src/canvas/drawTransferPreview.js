import { worldToScreen } from './camera.js';

// Draw a Hohmann (or bi-elliptic) transfer preview ellipse on the canvas
export function drawTransferPreview(ctx, cam, canvas, previewPoints) {
  if (!previewPoints || previewPoints.length < 2) return;

  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = 'rgba(255, 200, 80, 0.6)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  for (let i = 0; i < previewPoints.length; i++) {
    const screen = worldToScreen(previewPoints[i].x, previewPoints[i].y, cam, canvas);
    if (i === 0) {
      ctx.moveTo(screen.x, screen.y);
    } else {
      ctx.lineTo(screen.x, screen.y);
    }
  }
  ctx.stroke();

  // Draw departure and arrival markers
  const departScreen = worldToScreen(previewPoints[0].x, previewPoints[0].y, cam, canvas);
  const arriveScreen = worldToScreen(
    previewPoints[previewPoints.length - 1].x,
    previewPoints[previewPoints.length - 1].y,
    cam,
    canvas
  );

  // Departure: green circle
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(0, 255, 100, 0.8)';
  ctx.beginPath();
  ctx.arc(departScreen.x, departScreen.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // Arrival: red circle
  ctx.fillStyle = 'rgba(255, 80, 80, 0.8)';
  ctx.beginPath();
  ctx.arc(arriveScreen.x, arriveScreen.y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

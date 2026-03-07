// Transform world coordinates (meters, Sun at origin) to screen pixels
// When camera.rotatingCtx is set, applies rotation around the pivot point
export function worldToScreen(wx, wy, camera, canvas) {
  let fx = wx, fy = wy;
  if (camera.rotatingCtx) {
    const { pivotX, pivotY, angle } = camera.rotatingCtx;
    const dx = wx - pivotX, dy = wy - pivotY;
    const cos = Math.cos(-angle), sin = Math.sin(-angle);
    fx = dx * cos - dy * sin + pivotX;
    fy = dx * sin + dy * cos + pivotY;
  }
  const sx = (fx - camera.centerX) * camera.zoom + canvas.width / 2;
  const sy = canvas.height / 2 - (fy - camera.centerY) * camera.zoom;
  return { x: sx, y: sy };
}

// Transform screen pixels to world coordinates (inverse of worldToScreen)
export function screenToWorld(sx, sy, camera, canvas) {
  const fx = (sx - canvas.width / 2) / camera.zoom + camera.centerX;
  const fy = (canvas.height / 2 - sy) / camera.zoom + camera.centerY;
  if (camera.rotatingCtx) {
    const { pivotX, pivotY, angle } = camera.rotatingCtx;
    const dx = fx - pivotX, dy = fy - pivotY;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return { x: dx * cos - dy * sin + pivotX, y: dx * sin + dy * cos + pivotY };
  }
  return { x: fx, y: fy };
}

// Get the world-space width visible on screen (meters)
export function visibleWidth(camera, canvas) {
  return canvas.width / camera.zoom;
}

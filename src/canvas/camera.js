// Transform world coordinates (meters, Sun at origin) to screen pixels
export function worldToScreen(wx, wy, camera, canvas) {
  const sx = (wx - camera.centerX) * camera.zoom + canvas.width / 2;
  const sy = canvas.height / 2 - (wy - camera.centerY) * camera.zoom;
  return { x: sx, y: sy };
}

// Transform screen pixels to world coordinates
export function screenToWorld(sx, sy, camera, canvas) {
  const wx = (sx - canvas.width / 2) / camera.zoom + camera.centerX;
  const wy = (canvas.height / 2 - sy) / camera.zoom + camera.centerY;
  return { x: wx, y: wy };
}

// Get the world-space width visible on screen (meters)
export function visibleWidth(camera, canvas) {
  return canvas.width / camera.zoom;
}

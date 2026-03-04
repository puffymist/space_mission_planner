import { screenToWorld } from './camera.js';
import { dist } from '../utils/vector.js';
import { getAllBodyPositions } from '../physics/bodyPosition.js';

// Set up mouse event handlers on the canvas
export function setupInteraction(canvas, cameraStore, simStore) {
  let dragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    cameraStore.getState().zoomAt(factor, e.offsetX, e.offsetY, canvas);
  }, { passive: false });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      dragging = true;
      lastMouseX = e.offsetX;
      lastMouseY = e.offsetY;
      canvas.style.cursor = 'grabbing';
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (dragging) {
      const state = cameraStore.getState();
      const dx = (e.offsetX - lastMouseX) / state.zoom;
      const dy = (e.offsetY - lastMouseY) / state.zoom;
      cameraStore.setState({
        centerX: state.centerX - dx,
        centerY: state.centerY + dy, // Y is flipped
        trackTarget: null, // break tracking when user pans
      });
      lastMouseX = e.offsetX;
      lastMouseY = e.offsetY;
    }
  });

  canvas.addEventListener('mouseup', () => {
    dragging = false;
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('mouseleave', () => {
    dragging = false;
    canvas.style.cursor = 'default';
  });

  // Click to select/track a body
  canvas.addEventListener('click', (e) => {
    if (dragging) return;
    const state = cameraStore.getState();
    const worldPos = screenToWorld(e.offsetX, e.offsetY, state, canvas);
    const epoch = simStore.getState().epoch;
    const positions = getAllBodyPositions(epoch);

    // Find closest body within 20px
    let closestId = null;
    let closestDist = Infinity;
    for (const [id, pos] of Object.entries(positions)) {
      const d = dist(worldPos, pos);
      const screenDist = d * state.zoom;
      if (screenDist < 20 && screenDist < closestDist) {
        closestDist = screenDist;
        closestId = id;
      }
    }

    if (closestId) {
      cameraStore.setState({ trackTarget: closestId });
    }
  });

  // Double-click to clear tracking
  canvas.addEventListener('dblclick', () => {
    cameraStore.setState({ trackTarget: null });
  });
}

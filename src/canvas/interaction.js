import { screenToWorld } from './camera.js';
import { dist } from '../utils/vector.js';
import { getAllBodyPositions } from '../physics/bodyPosition.js';
import BODIES from '../constants/bodies.js';
import useUIStore from '../state/useUIStore.js';
import useCameraStore from '../state/useCameraStore.js';
import useSimStore from '../state/useSimStore.js';
import useCraftStore from '../state/useCraftStore.js';

export function setupInteraction(canvas) {
  let dragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  const logicalCanvas = () => ({
    width: canvas._logicalWidth || canvas.width,
    height: canvas._logicalHeight || canvas.height,
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    useCameraStore.getState().zoomAt(factor, e.offsetX, e.offsetY, logicalCanvas());
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
      const state = useCameraStore.getState();
      const dx = (e.offsetX - lastMouseX) / state.zoom;
      const dy = (e.offsetY - lastMouseY) / state.zoom;
      useCameraStore.setState({
        centerX: state.centerX - dx,
        centerY: state.centerY + dy,
        trackTarget: null,
        trackType: null,
      });
      lastMouseX = e.offsetX;
      lastMouseY = e.offsetY;
      return;
    }

    // Hover detection in world coordinates (fast)
    const cam = useCameraStore.getState();
    const lc = logicalCanvas();
    const worldPos = screenToWorld(e.offsetX, e.offsetY, cam, lc);
    const epoch = useSimStore.getState().epoch;

    // Threshold in world coords: 15 pixels worth of world distance
    const threshold = 15 / cam.zoom;

    let bestDist = threshold;
    let bestEpoch = null;
    let bestType = null;
    let bestId = null;

    // 1. Check spacecraft trajectories in world space
    const crafts = useCraftStore.getState().crafts;
    for (const craft of crafts) {
      if (!craft.segments) continue;
      for (const seg of craft.segments) {
        // Sample every few points for speed, then refine
        const step = Math.max(1, Math.floor(seg.length / 500));
        for (let i = 0; i < seg.length; i += step) {
          const pt = seg[i];
          const dx = pt.x - worldPos.x;
          const dy = pt.y - worldPos.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < bestDist) {
            bestDist = d;
            bestEpoch = pt.t;
            bestType = 'trajectory';
            bestId = craft.id;
          }
        }
        // Refine around best match
        if (bestType === 'trajectory' && bestId === craft.id) {
          const bestIdx = seg.findIndex(p => p.t === bestEpoch);
          if (bestIdx >= 0) {
            const lo = Math.max(0, bestIdx - step);
            const hi = Math.min(seg.length - 1, bestIdx + step);
            for (let i = lo; i <= hi; i++) {
              const pt = seg[i];
              const dx = pt.x - worldPos.x;
              const dy = pt.y - worldPos.y;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < bestDist) {
                bestDist = d;
                bestEpoch = pt.t;
              }
            }
          }
        }
      }
    }

    // 2. Check body orbits
    if (!bestEpoch) {
      const bodyPositions = getAllBodyPositions(epoch);
      for (const body of BODIES) {
        if (body.id === 'sun' || body.orbitalRadius === 0) continue;

        let cx = 0, cy = 0;
        if (body.parent !== 'sun') {
          const pp = bodyPositions[body.parent];
          cx = pp.x; cy = pp.y;
        }

        const dwx = worldPos.x - cx;
        const dwy = worldPos.y - cy;
        const distToCenter = Math.sqrt(dwx * dwx + dwy * dwy);
        const orbitDist = Math.abs(distToCenter - body.orbitalRadius);

        if (orbitDist < bestDist) {
          const angle = Math.atan2(dwy, dwx);
          const currentAngle = body.initialAngle + body.angularVelocity * epoch;
          let dAngle = angle - currentAngle;
          if (body.angularVelocity >= 0) {
            dAngle = ((dAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          } else {
            dAngle = ((dAngle % (2 * Math.PI)) - 2 * Math.PI) % (2 * Math.PI);
            if (dAngle > 0) dAngle -= 2 * Math.PI;
          }
          const dt = dAngle / body.angularVelocity;

          bestDist = orbitDist;
          bestEpoch = epoch + dt;
          bestType = 'orbit';
          bestId = body.id;
        }
      }
    }

    if (bestEpoch !== null) {
      useUIStore.getState().setHover(bestEpoch, bestType, bestId, e.offsetX, e.offsetY);
    } else {
      useUIStore.getState().clearHover();
    }
  });

  canvas.addEventListener('mouseup', () => {
    dragging = false;
    canvas.style.cursor = useUIStore.getState().placementMode ? 'crosshair' : 'default';
  });

  canvas.addEventListener('mouseleave', () => {
    dragging = false;
    canvas.style.cursor = 'default';
    useUIStore.getState().clearHover();
  });

  canvas.addEventListener('click', (e) => {
    if (dragging) return;

    const uiState = useUIStore.getState();
    const cam = useCameraStore.getState();
    const lc = logicalCanvas();
    const worldPos = screenToWorld(e.offsetX, e.offsetY, cam, lc);
    const epoch = useSimStore.getState().epoch;

    // Placement mode: place spacecraft at click position
    if (uiState.placementMode) {
      useCraftStore.getState().placeAtPosition(worldPos.x, worldPos.y, epoch);
      useUIStore.setState({ placementMode: false });
      canvas.style.cursor = 'default';
      return;
    }

    // If hovering over a trajectory/orbit point, click sets epoch to that time
    if (uiState.hoveredEpoch !== null) {
      useSimStore.getState().setEpoch(uiState.hoveredEpoch);
      return;
    }

    const positions = getAllBodyPositions(epoch);

    let closestId = null;
    let closestDist = Infinity;
    for (const [id, pos] of Object.entries(positions)) {
      const d = dist(worldPos, pos);
      const screenDist = d * cam.zoom;
      if (screenDist < 20 && screenDist < closestDist) {
        closestDist = screenDist;
        closestId = id;
      }
    }

    if (closestId) {
      useCameraStore.setState({ trackTarget: closestId, trackType: 'body' });
    }
  });

  canvas.addEventListener('dblclick', () => {
    useCameraStore.setState({ trackTarget: null, trackType: null });
  });
}

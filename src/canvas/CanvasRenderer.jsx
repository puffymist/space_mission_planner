import { useRef, useEffect } from 'react';
import useCameraStore from '../state/useCameraStore.js';
import useSimStore from '../state/useSimStore.js';
import useCraftStore from '../state/useCraftStore.js';
import useUIStore from '../state/useUIStore.js';
import { BODY_MAP } from '../constants/bodies.js';
import { AU } from '../constants/physics.js';
import { getAllBodyPositions, getBodyPosition } from '../physics/bodyPosition.js';
import { drawOrbits } from './drawOrbits.js';
import { drawBodies } from './drawBodies.js';
import { drawTrajectory } from './drawTrajectory.js';
import { drawSpacecraft } from './drawSpacecraft.js';
import { drawGhosts } from './drawGhosts.js';
import { drawTransferPreview } from './drawTransferPreview.js';
import { setupInteraction } from './interaction.js';
import { interpolateState } from '../utils/interpolate.js';
import { worldToScreen } from './camera.js';

// Keyboard shortcut: digit -> body to track
const DIGIT_BODIES = {
  '1': 'mercury', '2': 'venus', '3': 'earth', '4': 'mars',
  '5': 'jupiter', '6': 'saturn', '7': 'uranus', '8': 'neptune', '0': 'sun',
};

function drawScaleBar(ctx, cam, canvas) {
  // Pick a nice round scale length in world units
  const pixelTarget = 120; // target bar length in pixels
  const worldPerPx = 1 / cam.zoom;
  const worldTarget = pixelTarget * worldPerPx;

  // Find the nearest "nice" number
  const exp = Math.floor(Math.log10(worldTarget));
  const base = Math.pow(10, exp);
  let nice = base;
  if (worldTarget / base >= 5) nice = 5 * base;
  else if (worldTarget / base >= 2) nice = 2 * base;

  const barPx = nice * cam.zoom;

  // Format label
  let label;
  if (nice >= AU * 0.5) {
    label = (nice / AU).toFixed(nice >= AU * 5 ? 0 : 1) + ' AU';
  } else if (nice >= 1e9) {
    label = (nice / 1e9).toFixed(nice >= 1e10 ? 0 : 1) + ' Gm';
  } else if (nice >= 1e6) {
    label = (nice / 1e6).toFixed(nice >= 1e7 ? 0 : 1) + ' Mm';
  } else if (nice >= 1e3) {
    label = (nice / 1e3).toFixed(nice >= 1e4 ? 0 : 1) + ' km';
  } else {
    label = nice.toFixed(0) + ' m';
  }

  const x = canvas.width - 20 - barPx;
  const y = canvas.height - 50; // above the epoch slider

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x, y);
  ctx.lineTo(x + barPx, y);
  ctx.lineTo(x + barPx, y - 4);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + barPx / 2, y - 6);
  ctx.restore();
}

export default function CanvasRenderer() {
  const canvasRef = useRef(null);
  const interactionSetup = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(dpr, dpr);
      canvas._logicalWidth = rect.width;
      canvas._logicalHeight = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);

    if (!interactionSetup.current) {
      setupInteraction(canvas);
      interactionSetup.current = true;
    }

    // Keyboard shortcuts
    function handleKeyDown(e) {
      // Ignore if typing in an input/select
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      const cam = useCameraStore.getState();
      const sim = useSimStore.getState();
      const panAmount = 100 / cam.zoom;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          useSimStore.setState({ playing: !sim.playing });
          break;
        case '=':
        case '+':
          useCameraStore.setState({ zoom: cam.zoom * 1.5 });
          break;
        case '-':
          useCameraStore.setState({ zoom: cam.zoom / 1.5 });
          break;
        case 'ArrowLeft':
          useCameraStore.setState({ centerX: cam.centerX - panAmount, trackTarget: null, trackType: null });
          break;
        case 'ArrowRight':
          useCameraStore.setState({ centerX: cam.centerX + panAmount, trackTarget: null, trackType: null });
          break;
        case 'ArrowUp':
          useCameraStore.setState({ centerY: cam.centerY + panAmount, trackTarget: null, trackType: null });
          break;
        case 'ArrowDown':
          useCameraStore.setState({ centerY: cam.centerY - panAmount, trackTarget: null, trackType: null });
          break;
        case 'p':
        case 'P':
          useUIStore.setState((s) => ({ placementMode: !s.placementMode }));
          break;
        default: {
          // Digit keys: jump to body
          const bodyId = DIGIT_BODIES[e.key];
          if (bodyId) {
            const epoch = useSimStore.getState().epoch;
            const pos = getBodyPosition(bodyId, epoch);
            const body = BODY_MAP[bodyId];
            let zoom;
            if (bodyId === 'sun') zoom = 400 / (2 * AU);
            else if (body.parent === 'sun') zoom = 400 / (body.orbitalRadius * 0.02);
            else zoom = 400 / (3 * body.orbitalRadius);
            useCameraStore.setState({ centerX: pos.x, centerY: pos.y, zoom, trackTarget: bodyId, trackType: 'body' });
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);

    let lastTime = performance.now();

    function frame(now) {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const sim = useSimStore.getState();
      const camera = useCameraStore.getState();

      if (sim.playing) {
        useSimStore.setState({ epoch: sim.epoch + sim.speed * dt });
      }

      const epoch = useSimStore.getState().epoch;

      if (camera.trackTarget) {
        let targetPos = null;
        if (camera.trackType === 'craft') {
          const craft = useCraftStore.getState().crafts.find(c => c.id === camera.trackTarget);
          if (craft) targetPos = interpolateState(craft.segments, epoch);
        }
        if (!targetPos) {
          targetPos = getBodyPosition(camera.trackTarget, epoch);
        }
        if (targetPos) {
          useCameraStore.setState({ centerX: targetPos.x, centerY: targetPos.y });
        }
      }

      const cam = useCameraStore.getState();

      const logicalCanvas = {
        width: canvas._logicalWidth || canvas.width,
        height: canvas._logicalHeight || canvas.height,
      };

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, logicalCanvas.width, logicalCanvas.height);

      const bodyPositions = getAllBodyPositions(epoch);

      const epochStep = useSimStore.getState().epochStep;

      // Draw layers (back to front)
      drawOrbits(ctx, cam, logicalCanvas, bodyPositions, epochStep);

      // Ghost positions (drawn behind everything else)
      const ui = useUIStore.getState();
      const crafts = useCraftStore.getState().crafts;
      if (ui.hoveredEpoch !== null) {
        drawGhosts(ctx, cam, logicalCanvas, ui.hoveredEpoch, crafts);
      }

      // Transfer preview ellipse
      if (ui.transferPreview) {
        drawTransferPreview(ctx, cam, logicalCanvas, ui.transferPreview);
      }

      // Live maneuver preview (dashed, semi-transparent)
      if (ui.maneuverPreview && ui.maneuverPreview.segments) {
        ctx.save();
        ctx.strokeStyle = ui.maneuverPreview.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4;
        ctx.setLineDash([6, 4]);
        for (const seg of ui.maneuverPreview.segments) {
          if (seg.length < 2) continue;
          ctx.beginPath();
          let started = false;
          for (const pt of seg) {
            const scr = worldToScreen(pt.x, pt.y, cam, logicalCanvas);
            if (scr.x < -500 || scr.x > logicalCanvas.width + 500 ||
                scr.y < -500 || scr.y > logicalCanvas.height + 500) {
              if (started) { ctx.stroke(); ctx.beginPath(); started = false; }
              continue;
            }
            if (!started) { ctx.moveTo(scr.x, scr.y); started = true; }
            else ctx.lineTo(scr.x, scr.y);
          }
          if (started) ctx.stroke();
        }
        ctx.restore();
      }

      // Trajectories
      for (const craft of crafts) {
        drawTrajectory(ctx, cam, logicalCanvas, craft.segments, craft.color, epoch, epochStep);
      }

      drawBodies(ctx, cam, logicalCanvas, bodyPositions);

      for (const craft of crafts) {
        drawSpacecraft(ctx, cam, logicalCanvas, craft, epoch);
      }

      // Drag preview: draw ghost diamond at drag position
      const dragPreview = ui.dragPreview;
      if (dragPreview) {
        const scr = worldToScreen(dragPreview.x, dragPreview.y, cam, logicalCanvas);
        const dragCraft = crafts.find(c => c.id === dragPreview.craftId);
        if (dragCraft) {
          const s = 6;
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(scr.x, scr.y - s);
          ctx.lineTo(scr.x + s, scr.y);
          ctx.lineTo(scr.x, scr.y + s);
          ctx.lineTo(scr.x - s, scr.y);
          ctx.closePath();
          ctx.fillStyle = dragCraft.color;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      // Computing indicator: pulsing dot at end of trajectory being computed
      const computingCrafts = useCraftStore.getState().computingCrafts;
      if (computingCrafts && computingCrafts.size > 0) {
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(now / 400));
        for (const craft of crafts) {
          if (!computingCrafts.has(craft.id)) continue;
          if (!craft.segments || craft.segments.length === 0) continue;
          const lastSeg = craft.segments[craft.segments.length - 1];
          if (!lastSeg || lastSeg.length === 0) continue;
          const lastPt = lastSeg[lastSeg.length - 1];
          const scr = worldToScreen(lastPt.x, lastPt.y, cam, logicalCanvas);
          ctx.beginPath();
          ctx.arc(scr.x, scr.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = craft.color;
          ctx.globalAlpha = pulse;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }

      // Scale bar
      drawScaleBar(ctx, cam, logicalCanvas);

      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}

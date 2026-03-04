import { useRef, useEffect } from 'react';
import useCameraStore from '../state/useCameraStore.js';
import useSimStore from '../state/useSimStore.js';
import useCraftStore from '../state/useCraftStore.js';
import { getAllBodyPositions, getBodyPosition } from '../physics/bodyPosition.js';
import { drawOrbits } from './drawOrbits.js';
import { drawBodies } from './drawBodies.js';
import { drawTrajectory } from './drawTrajectory.js';
import { drawSpacecraft } from './drawSpacecraft.js';
import { setupInteraction } from './interaction.js';

export default function CanvasRenderer() {
  const canvasRef = useRef(null);
  const interactionSetup = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;

    // Resize canvas to fill parent
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

    // Set up mouse interaction (once)
    if (!interactionSetup.current) {
      setupInteraction(canvas, useCameraStore, useSimStore);
      interactionSetup.current = true;
    }

    let lastTime = performance.now();

    function frame(now) {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const sim = useSimStore.getState();
      const camera = useCameraStore.getState();

      // Advance epoch if playing
      if (sim.playing) {
        useSimStore.setState({ epoch: sim.epoch + sim.speed * dt });
      }

      const epoch = useSimStore.getState().epoch;

      // Track target body
      if (camera.trackTarget) {
        const targetPos = getBodyPosition(camera.trackTarget, epoch);
        useCameraStore.setState({ centerX: targetPos.x, centerY: targetPos.y });
      }

      const cam = useCameraStore.getState();

      const logicalCanvas = {
        width: canvas._logicalWidth || canvas.width,
        height: canvas._logicalHeight || canvas.height,
      };

      // Clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, logicalCanvas.width, logicalCanvas.height);

      // Compute body positions
      const bodyPositions = getAllBodyPositions(epoch);

      // Draw layers (back to front)
      drawOrbits(ctx, cam, logicalCanvas, bodyPositions);

      // Draw spacecraft trajectories
      const crafts = useCraftStore.getState().crafts;
      for (const craft of crafts) {
        drawTrajectory(ctx, cam, logicalCanvas, craft.segments, craft.color, epoch);
      }

      drawBodies(ctx, cam, logicalCanvas, bodyPositions);

      // Draw spacecraft markers on top
      for (const craft of crafts) {
        drawSpacecraft(ctx, cam, logicalCanvas, craft, epoch);
      }

      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}

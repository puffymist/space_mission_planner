import { useRef, useEffect } from 'react';
import useCameraStore from '../state/useCameraStore.js';
import useSimStore from '../state/useSimStore.js';
import { getAllBodyPositions, getBodyPosition } from '../physics/bodyPosition.js';
import { drawOrbits } from './drawOrbits.js';
import { drawBodies } from './drawBodies.js';
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
      // Store logical size for coordinate transforms
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
      const dt = (now - lastTime) / 1000; // real seconds elapsed
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

      // Get updated camera after tracking
      const cam = useCameraStore.getState();

      // Use logical dimensions for drawing
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

      // Draw layers
      drawOrbits(ctx, cam, logicalCanvas, bodyPositions);
      drawBodies(ctx, cam, logicalCanvas, bodyPositions);

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

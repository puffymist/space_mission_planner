import useUIStore from '../state/useUIStore.js';
import useCraftStore from '../state/useCraftStore.js';
import { BODY_MAP } from '../constants/bodies.js';
import { formatEpoch, formatVelocity, formatDistance } from '../utils/time.js';
import { interpolateState } from '../utils/interpolate.js';
import { getBodyPosition } from '../physics/bodyPosition.js';
import { mag, sub } from '../utils/vector.js';

export default function TrajectoryInfo() {
  const hoveredEpoch = useUIStore((s) => s.hoveredEpoch);
  const hoverType = useUIStore((s) => s.hoverType);
  const hoveredId = useUIStore((s) => s.hoveredId);
  const hoverScreenX = useUIStore((s) => s.hoverScreenX);
  const hoverScreenY = useUIStore((s) => s.hoverScreenY);
  const crafts = useCraftStore((s) => s.crafts);

  if (hoveredEpoch === null) return null;

  let lines = [];
  lines.push(formatEpoch(hoveredEpoch));

  if (hoverType === 'trajectory') {
    const craft = crafts.find(c => c.id === hoveredId);
    if (craft) {
      const state = interpolateState(craft.segments, hoveredEpoch);
      if (state) {
        const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
        lines.push(`${craft.name}: ${formatVelocity(speed)}`);

        // Distance to origin body
        const bodyPos = getBodyPosition(craft.originBodyId, hoveredEpoch);
        const d = mag(sub(state, bodyPos));
        lines.push(`from ${craft.originBodyId}: ${formatDistance(d)}`);
      }
    }
  } else if (hoverType === 'orbit') {
    const body = BODY_MAP[hoveredId];
    if (body) {
      lines.push(`Next: ${body.name}`);
    }
  }

  // Position tooltip near cursor but keep on screen
  const x = Math.min(hoverScreenX + 15, window.innerWidth - 200);
  const y = Math.max(hoverScreenY - 60, 10);

  return (
    <div style={{ ...styles.tooltip, left: x, top: y }}>
      {lines.map((line, i) => (
        <div key={i} style={i === 0 ? styles.epochLine : styles.infoLine}>{line}</div>
      ))}
    </div>
  );
}

const styles = {
  tooltip: {
    position: 'absolute',
    background: 'rgba(0, 0, 0, 0.85)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    padding: '4px 8px',
    zIndex: 20,
    pointerEvents: 'none',
    maxWidth: 220,
  },
  epochLine: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#8af',
    marginBottom: 2,
  },
  infoLine: {
    fontSize: 10,
    color: '#ccc',
  },
};

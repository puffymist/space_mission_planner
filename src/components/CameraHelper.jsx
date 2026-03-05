import { useState } from 'react';
import useCameraStore from '../state/useCameraStore.js';
import useSimStore from '../state/useSimStore.js';
import BODIES, { BODY_MAP } from '../constants/bodies.js';
import { AU } from '../constants/physics.js';
import { getBodyPosition } from '../physics/bodyPosition.js';

// Sensible zoom levels for each body type
// The zoom is set so that the body's interesting region fills the screen
function getZoomForBody(bodyId) {
  const body = BODY_MAP[bodyId];
  if (!body) return 1 / (3 * AU / 400);

  if (bodyId === 'sun') {
    // Show inner solar system (~2 AU radius)
    return 400 / (2 * AU);
  }

  if (body.parent === 'sun') {
    // For planets: zoom to show their moon system or Hill sphere
    // Use the outermost moon's orbit or a fraction of the planet's orbital radius
    const moons = BODIES.filter(b => b.parent === bodyId);
    if (moons.length > 0) {
      const maxMoonRadius = Math.max(...moons.map(m => m.orbitalRadius));
      return 400 / (3 * maxMoonRadius);
    }
    // No moons: show a reasonable area around the planet
    return 400 / (body.orbitalRadius * 0.02);
  }

  // For moons: zoom to show the moon's orbit around its parent
  return 400 / (3 * body.orbitalRadius);
}

// Preset camera positions
const PRESETS = [
  { label: 'Solar System', id: 'system', zoom: 400 / (35 * AU) },
  { label: 'Inner System', id: 'inner', zoom: 400 / (2.5 * AU) },
];

export default function CameraHelper() {
  const [target, setTarget] = useState('earth');
  const epoch = useSimStore((s) => s.epoch);

  const goTo = (bodyId) => {
    const pos = getBodyPosition(bodyId, epoch);
    const zoom = getZoomForBody(bodyId);
    useCameraStore.setState({
      centerX: pos.x,
      centerY: pos.y,
      zoom,
      trackTarget: bodyId,
    });
  };

  const goToPreset = (preset) => {
    useCameraStore.setState({
      centerX: 0,
      centerY: 0,
      zoom: preset.zoom,
      trackTarget: null,
    });
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Camera</div>
      <div style={styles.row}>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          style={styles.select}
        >
          {BODIES.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <button onClick={() => goTo(target)} style={styles.goBtn}>
          Go To
        </button>
      </div>
      <div style={styles.presets}>
        {PRESETS.map((p) => (
          <button key={p.id} onClick={() => goToPreset(p)} style={styles.presetBtn}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    position: 'absolute',
    top: 44,
    left: 8,
    width: 180,
    background: 'rgba(10, 10, 30, 0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: 8,
    zIndex: 10,
    backdropFilter: 'blur(8px)',
  },
  header: {
    fontSize: 12,
    fontWeight: 600,
    color: '#8af',
    marginBottom: 6,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: 4,
  },
  row: {
    display: 'flex',
    gap: 4,
    marginBottom: 6,
  },
  select: {
    flex: 1,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 11,
  },
  goBtn: {
    background: 'rgba(100,150,255,0.2)',
    border: '1px solid rgba(100,150,255,0.4)',
    color: '#8af',
    borderRadius: 3,
    padding: '2px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
  presets: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  presetBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#aaa',
    borderRadius: 3,
    padding: '2px 6px',
    fontSize: 10,
    cursor: 'pointer',
  },
};

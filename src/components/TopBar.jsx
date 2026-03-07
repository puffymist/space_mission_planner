import { useState } from 'react';
import useSimStore from '../state/useSimStore.js';
import useCameraStore from '../state/useCameraStore.js';
import { BODY_MAP } from '../constants/bodies.js';
import { formatEpoch } from '../utils/time.js';
import { dateToJ2000 } from '../constants/physics.js';

const SPEED_PRESETS = [
  { label: '-1 yr/s', value: -365.25 * 86400 },
  { label: '-30 d/s', value: -30 * 86400 },
  { label: '-1 d/s', value: -86400 },
  { label: '-1 h/s', value: -3600 },
  { label: '-1 min/s', value: -60 },
  { label: '-1 s/s', value: -1 },
  { label: '1 s/s', value: 1 },
  { label: '1 min/s', value: 60 },
  { label: '1 h/s', value: 3600 },
  { label: '1 d/s', value: 86400 },
  { label: '7 d/s', value: 7 * 86400 },
  { label: '30 d/s', value: 30 * 86400 },
  { label: '1 yr/s', value: 365.25 * 86400 },
];

// Parse a date/time string to J2000 seconds
// Accepts: "YYYY-MM-DD", "YYYY-MM-DD HH:mm", "YYYY-MM-DD HH:mm:ss"
function parseEpochInput(str) {
  const s = str.trim();
  if (!s) return null;
  let iso = s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) iso += 'T00:00:00Z';
  else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(iso)) iso = iso.replace(' ', 'T') + ':00Z';
  else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(iso)) iso = iso.replace(' ', 'T') + 'Z';
  else iso = iso.replace(' ', 'T');
  const ms = Date.parse(iso);
  if (isNaN(ms)) return null;
  return dateToJ2000(ms);
}

export default function TopBar() {
  const epoch = useSimStore((s) => s.epoch);
  const playing = useSimStore((s) => s.playing);
  const speed = useSimStore((s) => s.speed);
  const togglePlay = useSimStore((s) => s.togglePlay);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const setEpoch = useSimStore((s) => s.setEpoch);
  const [epochInput, setEpochInput] = useState('');

  const frameType = useCameraStore((s) => s.frameType);
  const trackTarget = useCameraStore((s) => s.trackTarget);
  const trackType = useCameraStore((s) => s.trackType);
  const toggleFrame = useCameraStore((s) => s.toggleFrame);

  // Rotating frame only available when tracking a non-Sun body with a parent
  const canRotate = trackTarget && trackType === 'body' && trackTarget !== 'sun' && BODY_MAP[trackTarget]?.parent;

  const handleEpochSubmit = () => {
    const t = parseEpochInput(epochInput);
    if (t !== null) setEpoch(t);
  };

  return (
    <div style={styles.bar}>
      <span style={styles.title}>Space Mission Planner</span>
      <span style={styles.epoch}>{formatEpoch(epoch)}</span>
      <button onClick={togglePlay} style={styles.btn}>
        {playing ? '⏸' : '▶'}
      </button>
      <select
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
        style={styles.select}
      >
        {SPEED_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <input
        type="text"
        value={epochInput}
        onChange={(e) => setEpochInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleEpochSubmit(); }}
        placeholder="YYYY-MM-DD HH:mm:ss"
        style={styles.epochInput}
      />
      <button onClick={handleEpochSubmit} style={styles.setBtn}>Set</button>
      {canRotate && (
        <button
          onClick={toggleFrame}
          style={frameType === 'rotating' ? styles.frameActive : styles.frameBtn}
          title="Toggle rotating reference frame (R)"
        >
          {frameType === 'rotating' ? 'Rotating' : 'Inertial'}
        </button>
      )}
    </div>
  );
}

const styles = {
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    background: 'rgba(10, 10, 26, 0.85)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 12,
    zIndex: 10,
    backdropFilter: 'blur(8px)',
  },
  title: {
    fontWeight: 600,
    fontSize: 13,
    color: '#8af',
    marginRight: 8,
  },
  epoch: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#ccc',
    minWidth: 200,
  },
  btn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 4,
    padding: '2px 10px',
    fontSize: 14,
    cursor: 'pointer',
  },
  select: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 4,
    padding: '2px 6px',
    fontSize: 12,
  },
  epochInput: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 4,
    padding: '2px 6px',
    fontSize: 11,
    fontFamily: 'monospace',
    width: 160,
  },
  setBtn: {
    background: 'rgba(100,150,255,0.2)',
    border: '1px solid rgba(100,150,255,0.4)',
    color: '#8af',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
  frameBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ccc',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  frameActive: {
    background: 'rgba(100,150,255,0.3)',
    border: '1px solid rgba(100,150,255,0.6)',
    color: '#8af',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    cursor: 'pointer',
    marginLeft: 'auto',
  },
};

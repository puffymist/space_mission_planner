import useSimStore from '../state/useSimStore.js';
import { formatEpoch } from '../utils/time.js';

const SPEED_PRESETS = [
  { label: '-1yr/s', value: -365.25 * 86400 },
  { label: '-30d/s', value: -30 * 86400 },
  { label: '-1d/s', value: -86400 },
  { label: '-1h/s', value: -3600 },
  { label: '1x', value: 1 },
  { label: '1h/s', value: 3600 },
  { label: '1d/s', value: 86400 },
  { label: '7d/s', value: 7 * 86400 },
  { label: '30d/s', value: 30 * 86400 },
  { label: '1yr/s', value: 365.25 * 86400 },
];

export default function TopBar() {
  const epoch = useSimStore((s) => s.epoch);
  const playing = useSimStore((s) => s.playing);
  const speed = useSimStore((s) => s.speed);
  const togglePlay = useSimStore((s) => s.togglePlay);
  const setSpeed = useSimStore((s) => s.setSpeed);

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
};

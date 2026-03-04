import useCraftStore from '../state/useCraftStore.js';
import useSimStore from '../state/useSimStore.js';
import BODIES from '../constants/bodies.js';
import { useState } from 'react';

export default function SpacecraftPanel() {
  const crafts = useCraftStore((s) => s.crafts);
  const selectedCraftId = useCraftStore((s) => s.selectedCraftId);
  const launchFromBody = useCraftStore((s) => s.launchFromBody);
  const selectCraft = useCraftStore((s) => s.selectCraft);
  const removeCraft = useCraftStore((s) => s.removeCraft);
  const epoch = useSimStore((s) => s.epoch);
  const [launchBody, setLaunchBody] = useState('earth');

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Spacecraft</div>

      <div style={styles.launchRow}>
        <select
          value={launchBody}
          onChange={(e) => setLaunchBody(e.target.value)}
          style={styles.select}
        >
          {BODIES.filter(b => b.id !== 'sun').map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <button
          onClick={() => launchFromBody(launchBody, epoch)}
          style={styles.launchBtn}
        >
          Launch
        </button>
      </div>

      <div style={styles.list}>
        {crafts.map((c) => (
          <div
            key={c.id}
            style={{
              ...styles.craftRow,
              ...(c.id === selectedCraftId ? styles.selected : {}),
            }}
            onClick={() => selectCraft(c.id)}
          >
            <span style={{ color: c.color, fontWeight: 600 }}>{c.name}</span>
            <span style={styles.origin}>from {c.originBodyId}</span>
            <button
              onClick={(e) => { e.stopPropagation(); removeCraft(c.id); }}
              style={styles.deleteBtn}
            >
              x
            </button>
          </div>
        ))}
        {crafts.length === 0 && (
          <div style={styles.empty}>No spacecraft. Launch one above.</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    position: 'absolute',
    top: 44,
    right: 8,
    width: 200,
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
  launchRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 8,
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
  launchBtn: {
    background: 'rgba(0,200,100,0.3)',
    border: '1px solid rgba(0,200,100,0.5)',
    color: '#0f8',
    borderRadius: 3,
    padding: '2px 8px',
    fontSize: 11,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  craftRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 6px',
    borderRadius: 3,
    cursor: 'pointer',
    fontSize: 11,
  },
  selected: {
    background: 'rgba(100,150,255,0.15)',
    border: '1px solid rgba(100,150,255,0.3)',
  },
  origin: {
    color: '#777',
    fontSize: 10,
    flex: 1,
  },
  deleteBtn: {
    background: 'rgba(255,50,50,0.2)',
    border: '1px solid rgba(255,50,50,0.3)',
    color: '#f66',
    borderRadius: 3,
    padding: '0 5px',
    fontSize: 10,
    cursor: 'pointer',
  },
  empty: {
    color: '#555',
    fontSize: 11,
    fontStyle: 'italic',
    padding: 4,
  },
};

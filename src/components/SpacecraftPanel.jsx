import useCraftStore from '../state/useCraftStore.js';
import useSimStore from '../state/useSimStore.js';
import useUIStore from '../state/useUIStore.js';
import BODIES from '../constants/bodies.js';
import { useState } from 'react';

export default function SpacecraftPanel() {
  const crafts = useCraftStore((s) => s.crafts);
  const selectedCraftId = useCraftStore((s) => s.selectedCraftId);
  const launchFromBody = useCraftStore((s) => s.launchFromBody);
  const selectCraft = useCraftStore((s) => s.selectCraft);
  const removeCraft = useCraftStore((s) => s.removeCraft);
  const epoch = useSimStore((s) => s.epoch);
  const placementMode = useUIStore((s) => s.placementMode);
  const [launchBody, setLaunchBody] = useState('earth');
  const [altitudeKm, setAltitudeKm] = useState('');

  const handleLaunch = () => {
    const altM = altitudeKm ? Number(altitudeKm) * 1000 : 0; // 0 = use default
    launchFromBody(launchBody, epoch, altM);
  };

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
        <button onClick={handleLaunch} style={styles.launchBtn}>
          Launch
        </button>
      </div>

      <div style={styles.altRow}>
        <span style={styles.altLabel}>Alt (km):</span>
        <input
          type="number"
          value={altitudeKm}
          onChange={(e) => setAltitudeKm(e.target.value)}
          placeholder="auto"
          style={styles.altInput}
        />
        <button
          onClick={() => useUIStore.setState({ placementMode: !placementMode })}
          style={placementMode ? { ...styles.placeBtn, ...styles.placeBtnActive } : styles.placeBtn}
          title="Click on canvas to place spacecraft"
        >
          Place
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
    width: 200,
    background: 'rgba(10, 10, 30, 0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: 8,
    backdropFilter: 'blur(8px)',
    pointerEvents: 'auto',
    maxHeight: '40vh',
    overflowY: 'auto',
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
  altRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  altLabel: {
    fontSize: 10,
    color: '#888',
  },
  altInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 11,
    textAlign: 'right',
  },
  placeBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#aaa',
    borderRadius: 3,
    padding: '2px 6px',
    fontSize: 10,
    cursor: 'pointer',
  },
  placeBtnActive: {
    background: 'rgba(0,200,100,0.2)',
    borderColor: 'rgba(0,200,100,0.5)',
    color: '#0f8',
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

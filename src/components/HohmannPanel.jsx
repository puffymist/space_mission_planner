import { useState, useMemo } from 'react';
import { BODY_MAP } from '../constants/bodies.js';
import BODIES from '../constants/bodies.js';
import useSimStore from '../state/useSimStore.js';
import useCraftStore from '../state/useCraftStore.js';
import useUIStore from '../state/useUIStore.js';
import {
  hohmannTransfer,
  biellipticTransfer,
  findNextWindow,
  hohmannPreviewPoints,
} from '../physics/hohmann.js';
import { interpolateState } from '../utils/interpolate.js';
import { formatEpochShort, formatDuration, formatVelocity, formatDistance } from '../utils/time.js';

// Group bodies by parent for the selector
function bodiesForParent(parentId) {
  return BODIES.filter(b => b.parent === parentId && b.orbitalRadius > 0);
}

// Available parents (Sun, Jupiter, Saturn, etc.)
const PARENTS_WITH_CHILDREN = BODIES.filter(p => {
  return BODIES.some(b => b.parent === p.id && b.orbitalRadius > 0);
}).map(p => p.id);

export default function HohmannPanel() {
  const epoch = useSimStore((s) => s.epoch);
  const [parentId, setParentId] = useState('sun');
  const [departId, setDepartId] = useState('earth');
  const [arriveId, setArriveId] = useState('mars');
  const [mode, setMode] = useState('hohmann'); // 'hohmann' or 'bielliptic'
  const [biRatio, setBiRatio] = useState(2); // intermediate radius = biRatio * max(r1, r2)
  const [windowEpoch, setWindowEpoch] = useState(null);

  const children = useMemo(() => bodiesForParent(parentId), [parentId]);

  // When parent changes, reset depart/arrive to first two children
  const handleParentChange = (newParent) => {
    setParentId(newParent);
    const kids = bodiesForParent(newParent);
    if (kids.length >= 2) {
      setDepartId(kids[0].id);
      setArriveId(kids[1].id);
    }
    setWindowEpoch(null);
  };

  // Compute transfer
  const transfer = useMemo(() => {
    if (departId === arriveId) return null;
    if (mode === 'hohmann') {
      return hohmannTransfer(departId, arriveId);
    } else {
      const r1 = BODY_MAP[departId]?.orbitalRadius || 0;
      const r2 = BODY_MAP[arriveId]?.orbitalRadius || 0;
      const rM = biRatio * Math.max(r1, r2);
      return biellipticTransfer(departId, arriveId, rM);
    }
  }, [departId, arriveId, mode, biRatio]);

  // Find next window
  const handleFindWindow = () => {
    if (!transfer) return;
    const nextEpoch = findNextWindow(departId, arriveId, epoch, transfer.requiredPhase);
    setWindowEpoch(nextEpoch);
    useSimStore.setState({ epoch: nextEpoch });
  };

  // Helper: get prograde unit vector from state
  const progradeDir = (state) => {
    const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
    if (speed < 1e-10) return { x: 1, y: 0 };
    return { x: state.vx / speed, y: state.vy / speed };
  };

  // Apply: create spacecraft with the transfer burns
  const handleApply = () => {
    if (!transfer) return;
    const launchEpoch = windowEpoch ?? epoch;

    // Launch from departure body
    useCraftStore.getState().launchFromBody(departId, launchEpoch);

    // Get the newly created craft
    const crafts = useCraftStore.getState().crafts;
    const craft = crafts[crafts.length - 1];
    if (!craft) return;

    // Burn 1: prograde at launch
    const dir1 = progradeDir(craft.initialState);
    const dv1 = mode === 'hohmann' ? transfer.dv1 : transfer.dv1;
    useCraftStore.getState().addDeltaV(
      craft.id,
      launchEpoch,
      dir1.x * dv1,
      dir1.y * dv1
    );

    if (mode === 'hohmann') {
      // Burn 2: prograde at arrival to circularize
      const arrivalEpoch = launchEpoch + transfer.transferTime;
      const segments = useCraftStore.getState().crafts.find(c => c.id === craft.id)?.segments;
      if (segments) {
        const arrState = interpolateState(segments, arrivalEpoch);
        if (arrState) {
          const dir2 = progradeDir(arrState);
          useCraftStore.getState().addDeltaV(
            craft.id,
            arrivalEpoch,
            dir2.x * transfer.dv2,
            dir2.y * transfer.dv2
          );
        }
      }
    } else {
      // Bi-elliptic: burns 2 and 3
      const midEpoch = launchEpoch + transfer.t1;
      const segments2 = useCraftStore.getState().crafts.find(c => c.id === craft.id)?.segments;
      if (segments2) {
        const midState = interpolateState(segments2, midEpoch);
        if (midState) {
          const dirM = progradeDir(midState);
          useCraftStore.getState().addDeltaV(
            craft.id,
            midEpoch,
            dirM.x * transfer.dv2,
            dirM.y * transfer.dv2
          );
        }
      }

      const arrivalEpoch = launchEpoch + transfer.transferTime;
      const segments3 = useCraftStore.getState().crafts.find(c => c.id === craft.id)?.segments;
      if (segments3) {
        const arrState = interpolateState(segments3, arrivalEpoch);
        if (arrState) {
          const dir3 = progradeDir(arrState);
          useCraftStore.getState().addDeltaV(
            craft.id,
            arrivalEpoch,
            dir3.x * (-transfer.dv3),
            dir3.y * (-transfer.dv3)
          );
        }
      }
    }

    // Store preview for canvas drawing
    if (mode === 'hohmann') {
      const previewPts = hohmannPreviewPoints(transfer, launchEpoch);
      useUIStore.setState({ transferPreview: previewPts });
      setTimeout(() => useUIStore.setState({ transferPreview: null }), 10000);
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Transfer Helper</div>

      <div style={styles.row}>
        <span style={styles.label}>System:</span>
        <select value={parentId} onChange={(e) => handleParentChange(e.target.value)} style={styles.select}>
          {PARENTS_WITH_CHILDREN.map(id => (
            <option key={id} value={id}>{BODY_MAP[id].name}</option>
          ))}
        </select>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>From:</span>
        <select value={departId} onChange={(e) => { setDepartId(e.target.value); setWindowEpoch(null); }} style={styles.select}>
          {children.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>To:</span>
        <select value={arriveId} onChange={(e) => { setArriveId(e.target.value); setWindowEpoch(null); }} style={styles.select}>
          {children.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Mode:</span>
        <div style={styles.modeButtons}>
          <button
            onClick={() => setMode('hohmann')}
            style={{ ...styles.modeBtn, ...(mode === 'hohmann' ? styles.modeBtnActive : {}) }}
          >Hohmann</button>
          <button
            onClick={() => setMode('bielliptic')}
            style={{ ...styles.modeBtn, ...(mode === 'bielliptic' ? styles.modeBtnActive : {}) }}
          >Bi-elliptic</button>
        </div>
      </div>

      {mode === 'bielliptic' && (
        <div style={styles.row}>
          <span style={styles.label}>R ratio:</span>
          <input
            type="range"
            min={1.1}
            max={10}
            step={0.1}
            value={biRatio}
            onChange={(e) => setBiRatio(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#8f8' }}
          />
          <span style={styles.value}>{biRatio.toFixed(1)}x</span>
        </div>
      )}

      {transfer && departId !== arriveId && (
        <div style={styles.results}>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Total Δv:</span>
            <span style={styles.resultValue}>{formatVelocity(transfer.totalDv)}</span>
          </div>
          {mode === 'hohmann' ? (
            <>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Burn 1:</span>
                <span style={styles.resultValue}>{formatVelocity(Math.abs(transfer.dv1))}</span>
              </div>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Burn 2:</span>
                <span style={styles.resultValue}>{formatVelocity(Math.abs(transfer.dv2))}</span>
              </div>
            </>
          ) : (
            <>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Burn 1:</span>
                <span style={styles.resultValue}>{formatVelocity(Math.abs(transfer.dv1))}</span>
              </div>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Burn 2:</span>
                <span style={styles.resultValue}>{formatVelocity(Math.abs(transfer.dv2))}</span>
              </div>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Burn 3:</span>
                <span style={styles.resultValue}>{formatVelocity(Math.abs(transfer.dv3))}</span>
              </div>
            </>
          )}
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Transfer:</span>
            <span style={styles.resultValue}>{formatDuration(transfer.transferTime)}</span>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Phase:</span>
            <span style={styles.resultValue}>
              {(transfer.requiredPhase * 180 / Math.PI).toFixed(1)}°
            </span>
          </div>

          {windowEpoch !== null && (
            <div style={styles.resultRow}>
              <span style={styles.resultLabel}>Window:</span>
              <span style={styles.resultValue}>{formatEpochShort(windowEpoch)}</span>
            </div>
          )}

          <div style={styles.buttonRow}>
            <button onClick={handleFindWindow} style={styles.windowBtn}>
              Find Window
            </button>
            <button onClick={handleApply} style={styles.applyBtn}>
              Apply
            </button>
          </div>
        </div>
      )}

      {departId === arriveId && (
        <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
          Select different departure and arrival bodies.
        </div>
      )}
    </div>
  );
}

const styles = {
  panel: {
    position: 'absolute',
    bottom: 44,
    left: 8,
    width: 210,
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
    color: '#8f8',
    marginBottom: 6,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: 4,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: '#888',
    minWidth: 42,
  },
  value: {
    fontSize: 11,
    color: '#ddd',
    fontFamily: 'monospace',
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
  modeButtons: {
    display: 'flex',
    gap: 3,
  },
  modeBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#aaa',
    borderRadius: 3,
    padding: '2px 8px',
    fontSize: 10,
    cursor: 'pointer',
  },
  modeBtnActive: {
    background: 'rgba(100,255,100,0.15)',
    borderColor: 'rgba(100,255,100,0.4)',
    color: '#8f8',
  },
  results: {
    marginTop: 6,
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: 4,
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    marginBottom: 2,
  },
  resultLabel: {
    color: '#888',
  },
  resultValue: {
    color: '#cfc',
    fontFamily: 'monospace',
  },
  buttonRow: {
    display: 'flex',
    gap: 4,
    marginTop: 6,
  },
  windowBtn: {
    flex: 1,
    background: 'rgba(100,200,255,0.15)',
    border: '1px solid rgba(100,200,255,0.4)',
    color: '#8cf',
    borderRadius: 4,
    padding: '4px 0',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
  },
  applyBtn: {
    flex: 1,
    background: 'rgba(100,255,100,0.15)',
    border: '1px solid rgba(100,255,100,0.4)',
    color: '#8f8',
    borderRadius: 4,
    padding: '4px 0',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

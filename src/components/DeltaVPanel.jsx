import { useState } from 'react';
import useCraftStore from '../state/useCraftStore.js';
import useSimStore from '../state/useSimStore.js';
import { DIRECTIONS, computeDeltaV } from '../physics/deltaV.js';
import { interpolateState } from '../utils/interpolate.js';
import { getBodyPosition } from '../physics/bodyPosition.js';
import { formatEpochShort, formatVelocity } from '../utils/time.js';
import BODIES from '../constants/bodies.js';
import FinenessControl from './FinenessControl.jsx';

export default function DeltaVPanel() {
  const selectedCraftId = useCraftStore((s) => s.selectedCraftId);
  const crafts = useCraftStore((s) => s.crafts);
  const addDeltaV = useCraftStore((s) => s.addDeltaV);
  const removeDeltaV = useCraftStore((s) => s.removeDeltaV);
  const epoch = useSimStore((s) => s.epoch);

  const [direction, setDirection] = useState('prograde');
  const [magnitude, setMagnitude] = useState(1000); // m/s
  const [refBody, setRefBody] = useState('sun');
  const [dvStep, setDvStep] = useState(100); // m/s step for slider
  const [customAngle, setCustomAngle] = useState(0); // degrees CCW from +X

  const craft = crafts.find((c) => c.id === selectedCraftId);
  if (!craft) return null;

  const dirDef = DIRECTIONS.find(d => d.id === direction);
  const needsBody = dirDef?.needsBody;
  const isCustom = direction === 'custom';

  const handleAdd = () => {
    const craftState = interpolateState(craft.segments, epoch);
    if (!craftState) return;

    const bodyPos = needsBody ? getBodyPosition(refBody, epoch) : null;
    const dv = computeDeltaV(direction, magnitude, craftState, bodyPos, customAngle);
    addDeltaV(craft.id, epoch, dv.dvx, dv.dvy);
  };

  // Slider range based on step
  const maxMag = dvStep * 100;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Delta-V Maneuvers</div>

      <div style={styles.section}>
        <div style={styles.row}>
          <span style={styles.label}>Epoch:</span>
          <span style={styles.value}>{formatEpochShort(epoch)}</span>
        </div>

        <div style={styles.row}>
          <span style={styles.label}>Direction:</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            style={styles.select}
          >
            {DIRECTIONS.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>

        {needsBody && (
          <div style={styles.row}>
            <span style={styles.label}>Ref body:</span>
            <select
              value={refBody}
              onChange={(e) => setRefBody(e.target.value)}
              style={styles.select}
            >
              {BODIES.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {isCustom && (
          <div style={styles.row}>
            <span style={styles.label}>Angle:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                value={customAngle}
                onChange={(e) => setCustomAngle(Number(e.target.value))}
                style={styles.angleInput}
              />
              <span style={{ fontSize: 10, color: '#888' }}>deg CCW</span>
            </div>
          </div>
        )}

        <div style={styles.row}>
          <span style={styles.label}>Magnitude:</span>
          <span style={styles.value}>{formatVelocity(magnitude)}</span>
        </div>

        <input
          type="range"
          min={0}
          max={maxMag}
          step={dvStep}
          value={Math.min(magnitude, maxMag)}
          onChange={(e) => setMagnitude(Number(e.target.value))}
          style={styles.slider}
        />

        <div style={styles.row}>
          <span style={styles.label}>Fineness:</span>
          <div style={styles.fineButtons}>
            {[1, 10, 100, 1000].map((s) => (
              <button
                key={s}
                onClick={() => setDvStep(s)}
                style={{
                  ...styles.fineBtn,
                  ...(dvStep === s ? styles.fineBtnActive : {}),
                }}
              >
                {s >= 1000 ? `${s/1000}km/s` : `${s}m/s`}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleAdd} style={styles.addBtn}>
          Add Maneuver
        </button>
      </div>

      {craft.events.length > 0 && (
        <div style={styles.section}>
          <div style={styles.subheader}>Maneuvers</div>
          {craft.events.map((ev, i) => {
            const dvMag = Math.sqrt(ev.dvx * ev.dvx + ev.dvy * ev.dvy);
            return (
              <div key={i} style={styles.eventRow}>
                <span style={styles.eventDate}>{formatEpochShort(ev.epoch)}</span>
                <span style={styles.eventDv}>{formatVelocity(dvMag)}</span>
                <button
                  onClick={() => removeDeltaV(craft.id, i)}
                  style={styles.deleteBtn}
                >
                  x
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  panel: {
    position: 'absolute',
    top: 170,
    right: 8,
    width: 220,
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
    color: '#fa8',
    marginBottom: 6,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: 4,
  },
  section: {
    marginBottom: 6,
  },
  subheader: {
    fontSize: 11,
    fontWeight: 600,
    color: '#aaa',
    marginBottom: 4,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: '#888',
  },
  value: {
    fontSize: 11,
    color: '#ddd',
    fontFamily: 'monospace',
  },
  select: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 11,
    maxWidth: 120,
  },
  slider: {
    width: '100%',
    height: 4,
    cursor: 'pointer',
    accentColor: '#fa8',
    marginBottom: 6,
  },
  fineButtons: {
    display: 'flex',
    gap: 3,
  },
  fineBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#aaa',
    borderRadius: 3,
    padding: '1px 5px',
    fontSize: 9,
    cursor: 'pointer',
  },
  fineBtnActive: {
    background: 'rgba(255,170,100,0.2)',
    borderColor: 'rgba(255,170,100,0.5)',
    color: '#fa8',
  },
  addBtn: {
    width: '100%',
    background: 'rgba(255,170,100,0.2)',
    border: '1px solid rgba(255,170,100,0.4)',
    color: '#fa8',
    borderRadius: 4,
    padding: '4px 0',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 4px',
    fontSize: 10,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  eventDate: {
    color: '#aaa',
    fontFamily: 'monospace',
    flex: 1,
  },
  eventDv: {
    color: '#fa8',
    fontFamily: 'monospace',
  },
  deleteBtn: {
    background: 'rgba(255,50,50,0.2)',
    border: '1px solid rgba(255,50,50,0.3)',
    color: '#f66',
    borderRadius: 3,
    padding: '0 5px',
    fontSize: 9,
    cursor: 'pointer',
  },
  angleInput: {
    width: 60,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 11,
    textAlign: 'right',
  },
};

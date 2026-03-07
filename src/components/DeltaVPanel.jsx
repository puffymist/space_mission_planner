import { useState, useEffect, useRef } from 'react';
import useCraftStore from '../state/useCraftStore.js';
import useSimStore from '../state/useSimStore.js';
import useUIStore from '../state/useUIStore.js';
import { DIRECTIONS, computeDeltaV, circularizeDeltaV } from '../physics/deltaV.js';
import { interpolateState } from '../utils/interpolate.js';
import { getBodyPosition, getAllBodyPositions } from '../physics/bodyPosition.js';
import { nearestBody } from '../physics/gravity.js';
import { formatEpochMedium, formatVelocity, formatDistance } from '../utils/time.js';
import { j2000ToDate, dateToJ2000 } from '../constants/physics.js';
import BODIES, { BODY_MAP } from '../constants/bodies.js';

// --- Preview worker for non-blocking maneuver preview ---
let previewWorker = null;

function computePreviewAsync(tempCraft, duration, callback) {
  if (previewWorker) previewWorker.terminate();
  previewWorker = new Worker(
    new URL('../physics/trajectoryWorker.js', import.meta.url),
    { type: 'module' }
  );
  previewWorker.onmessage = (e) => {
    if (e.data.type === 'progress' || e.data.type === 'done') {
      callback(e.data.segments);
      if (e.data.type === 'done') {
        previewWorker = null;
      }
    }
  };
  previewWorker.postMessage({
    type: 'compute',
    craft: {
      id: tempCraft.id,
      initialState: tempCraft.initialState,
      launchEpoch: tempCraft.launchEpoch,
      events: tempCraft.events,
    },
    duration,
    firstChunkDuration: Math.min(duration, 90 * 86400),
  });
}

export default function DeltaVPanel() {
  const selectedCraftId = useCraftStore((s) => s.selectedCraftId);
  const crafts = useCraftStore((s) => s.crafts);
  const addDeltaV = useCraftStore((s) => s.addDeltaV);
  const updateDeltaV = useCraftStore((s) => s.updateDeltaV);
  const removeDeltaV = useCraftStore((s) => s.removeDeltaV);
  const updateInitialState = useCraftStore((s) => s.updateInitialState);
  const epoch = useSimStore((s) => s.epoch);

  const [direction, setDirection] = useState('prograde');
  const [magnitude, setMagnitude] = useState(1000);
  const [refBody, setRefBody] = useState('sun');
  const [dvStep, setDvStep] = useState(100);
  const [customAngle, setCustomAngle] = useState(0);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editEpoch, setEditEpoch] = useState(null);
  const debounceRef = useRef(null);

  // Init editing state
  const [editingInit, setEditingInit] = useState(false);
  const [initEpoch, setInitEpoch] = useState(null);
  const [initX, setInitX] = useState(null);
  const [initY, setInitY] = useState(null);
  const [initVx, setInitVx] = useState(null);
  const [initVy, setInitVy] = useState(null);

  const craft = crafts.find((c) => c.id === selectedCraftId);

  // Live preview: debounced trajectory computation
  useEffect(() => {
    if (!craft || magnitude === 0) {
      useUIStore.setState({ maneuverPreview: null });
      return;
    }

    const maneuverEpoch = editingIndex !== null && editEpoch !== null ? editEpoch : epoch;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const craftState = interpolateState(craft.segments, maneuverEpoch);
      if (!craftState) return;

      const dirDef = DIRECTIONS.find(d => d.id === direction);
      const bodyPos = dirDef?.needsBody ? getBodyPosition(refBody, maneuverEpoch) : null;
      const dv = computeDeltaV(direction, magnitude, craftState, bodyPos, customAngle);

      const tempEvents = editingIndex !== null
        ? craft.events.map((ev, i) => i === editingIndex ? { epoch: maneuverEpoch, dvx: dv.dvx, dvy: dv.dvy } : ev)
        : [...craft.events, { epoch: maneuverEpoch, dvx: dv.dvx, dvy: dv.dvy }];

      const tempCraft = {
        ...craft,
        events: tempEvents.sort((a, b) => a.epoch - b.epoch),
      };

      const bodyPositions = getAllBodyPositions(maneuverEpoch);
      const { dist: nearDist } = nearestBody(craftState, bodyPositions);
      const previewDuration = nearDist < 5e7
        ? 180 * 86400
        : 2 * 365.25 * 86400;
      computePreviewAsync(tempCraft, previewDuration, (segments) => {
        useUIStore.setState({ maneuverPreview: { segments, color: craft.color } });
      });
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (previewWorker) { previewWorker.terminate(); previewWorker = null; }
    };
  }, [direction, magnitude, refBody, customAngle, epoch, editEpoch, craft?.id, editingIndex]);

  // Clear preview on unmount
  useEffect(() => {
    return () => useUIStore.setState({ maneuverPreview: null });
  }, []);

  if (!craft) return null;

  const dirDef = DIRECTIONS.find(d => d.id === direction);
  const needsBody = dirDef?.needsBody;
  const isCustom = direction === 'custom';

  const handleAddOrUpdate = () => {
    const maneuverEpoch = editingIndex !== null && editEpoch !== null ? editEpoch : epoch;
    const craftState = interpolateState(craft.segments, maneuverEpoch);
    if (!craftState) return;

    const bodyPos = needsBody ? getBodyPosition(refBody, maneuverEpoch) : null;
    const dv = computeDeltaV(direction, magnitude, craftState, bodyPos, customAngle);

    if (editingIndex !== null) {
      updateDeltaV(craft.id, editingIndex, { epoch: maneuverEpoch, dvx: dv.dvx, dvy: dv.dvy });
      setEditingIndex(null);
      setEditEpoch(null);
    } else {
      addDeltaV(craft.id, maneuverEpoch, dv.dvx, dv.dvy);
    }
    useUIStore.setState({ maneuverPreview: null });
  };

  const handleCircularize = () => {
    const craftState = interpolateState(craft.segments, epoch);
    if (!craftState) return;

    const dv = circularizeDeltaV(craftState, refBody, epoch);
    addDeltaV(craft.id, epoch, dv.dvx, dv.dvy);
  };

  const handleEditEvent = (index) => {
    const ev = craft.events[index];
    const dvMag = Math.sqrt(ev.dvx * ev.dvx + ev.dvy * ev.dvy);
    setMagnitude(dvMag);
    const angle = Math.atan2(ev.dvy, ev.dvx) * 180 / Math.PI;
    setDirection('custom');
    setCustomAngle(Math.round(angle * 10) / 10);
    setEditingIndex(index);
    setEditEpoch(ev.epoch);
    useSimStore.getState().setEpoch(ev.epoch);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditEpoch(null);
    useUIStore.setState({ maneuverPreview: null });
  };

  // Init state editing
  const handleEditInit = () => {
    setEditingInit(true);
    setEditingIndex(null);
    setEditEpoch(null);
    setInitEpoch(craft.launchEpoch);
    setInitX(craft.initialState.x / 1000); // display in km
    setInitY(craft.initialState.y / 1000);
    setInitVx(craft.initialState.vx);
    setInitVy(craft.initialState.vy);
  };

  const handleUpdateInit = () => {
    updateInitialState(craft.id, {
      launchEpoch: initEpoch,
      x: initX * 1000, // km → m
      y: initY * 1000,
      vx: initVx,
      vy: initVy,
    });
    setEditingInit(false);
  };

  const handleCancelInit = () => {
    setEditingInit(false);
  };

  // Helper to format datetime-local value
  const toDatetimeLocal = (t) => j2000ToDate(t).toISOString().slice(0, 19);
  const fromDatetimeLocal = (val) => dateToJ2000(new Date(val + 'Z'));

  const maxMag = dvStep * 100;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Delta-V Maneuvers</div>

      <div style={styles.section}>
        <div style={styles.row}>
          <span style={styles.label}>Epoch:</span>
          {editingIndex !== null ? (
            <input
              type="datetime-local"
              value={toDatetimeLocal(editEpoch)}
              onChange={(e) => {
                const t = fromDatetimeLocal(e.target.value);
                setEditEpoch(t);
                useSimStore.getState().setEpoch(t);
              }}
              step="1"
              style={styles.epochInput}
            />
          ) : (
            <span style={styles.value}>{formatEpochMedium(epoch)}</span>
          )}
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
          <input
            type="number"
            value={Math.round(magnitude * 10) / 10}
            onChange={(e) => setMagnitude(Math.max(0, Number(e.target.value)))}
            style={styles.magInput}
          />
          <span style={styles.magUnit}>m/s</span>
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

        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleAddOrUpdate} style={styles.addBtn}>
            {editingIndex !== null ? 'Update Maneuver' : 'Add Maneuver'}
          </button>
          {editingIndex !== null && (
            <button onClick={handleCancelEdit} style={styles.cancelBtn}>
              Cancel
            </button>
          )}
        </div>
        {needsBody && editingIndex === null && (
          <button onClick={handleCircularize} style={styles.circBtn}>
            Circularize ({BODY_MAP[refBody]?.name})
          </button>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.subheader}>Maneuvers</div>

        {/* Init params as maneuver 0 */}
        <div
          style={{ ...styles.initRow, cursor: 'pointer' }}
          onClick={handleEditInit}
          title="Click to edit initial state"
        >
          <div style={styles.initLabel}>
            #0 Launch
          </div>
          {editingInit ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 3 }}>
              <div style={styles.initEditRow}>
                <span style={styles.initEditLabel}>Epoch:</span>
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(initEpoch)}
                  onChange={(e) => setInitEpoch(fromDatetimeLocal(e.target.value))}
                  step="1"
                  style={styles.epochInput}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div style={styles.initEditRow}>
                <span style={styles.initEditLabel}>X (km):</span>
                <input
                  type="number"
                  value={Math.round(initX)}
                  onChange={(e) => setInitX(Number(e.target.value))}
                  style={styles.initNumInput}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div style={styles.initEditRow}>
                <span style={styles.initEditLabel}>Y (km):</span>
                <input
                  type="number"
                  value={Math.round(initY)}
                  onChange={(e) => setInitY(Number(e.target.value))}
                  style={styles.initNumInput}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div style={styles.initEditRow}>
                <span style={styles.initEditLabel}>Vx (m/s):</span>
                <input
                  type="number"
                  value={Math.round(initVx * 10) / 10}
                  onChange={(e) => setInitVx(Number(e.target.value))}
                  style={styles.initNumInput}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div style={styles.initEditRow}>
                <span style={styles.initEditLabel}>Vy (m/s):</span>
                <input
                  type="number"
                  value={Math.round(initVy * 10) / 10}
                  onChange={(e) => setInitVy(Number(e.target.value))}
                  style={styles.initNumInput}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                <button onClick={(e) => { e.stopPropagation(); handleUpdateInit(); }} style={styles.initUpdateBtn}>
                  Update
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleCancelInit(); }} style={styles.cancelBtn}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={styles.initDetail}>
                {formatEpochMedium(craft.launchEpoch)}
              </div>
              <div style={styles.initDetail}>
                {BODY_MAP[craft.originBodyId]?.name || craft.originBodyId}
                {craft.orbitAltitude ? ` · ${formatDistance(craft.orbitAltitude)}` : ''}
              </div>
            </>
          )}
        </div>

        {craft.events.map((ev, i) => {
          const dvMag = Math.sqrt(ev.dvx * ev.dvx + ev.dvy * ev.dvy);
          const isEditing = editingIndex === i;
          return (
            <div
              key={i}
              style={{
                ...styles.eventRow,
                ...(isEditing ? styles.eventRowEditing : {}),
              }}
              onClick={() => handleEditEvent(i)}
              title="Click to edit"
            >
              <div style={styles.eventInfo}>
                <span style={styles.eventIndex}>#{i + 1}</span>
                <span style={styles.eventDate}>{formatEpochMedium(ev.epoch)}</span>
              </div>
              <span style={styles.eventDv}>{formatVelocity(dvMag)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeDeltaV(craft.id, i); if (editingIndex === i) setEditingIndex(null); }}
                style={styles.deleteBtn}
              >
                x
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    position: 'absolute',
    top: 190,
    right: 8,
    width: 220,
    background: 'rgba(10, 10, 30, 0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: 8,
    zIndex: 10,
    backdropFilter: 'blur(8px)',
    maxHeight: 'calc(100vh - 260px)',
    overflowY: 'auto',
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
  magInput: {
    width: 60,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 11,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  magUnit: {
    fontSize: 10,
    color: '#888',
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
    flex: 1,
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
  cancelBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#aaa',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 11,
    cursor: 'pointer',
    marginTop: 4,
  },
  circBtn: {
    width: '100%',
    background: 'rgba(100,200,150,0.15)',
    border: '1px solid rgba(100,200,150,0.3)',
    color: '#6c8',
    borderRadius: 4,
    padding: '3px 0',
    fontSize: 10,
    cursor: 'pointer',
    marginTop: 4,
  },
  epochInput: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 10,
    fontFamily: 'monospace',
    width: 140,
  },
  initRow: {
    padding: '4px 4px',
    marginBottom: 4,
    borderLeft: '2px solid rgba(100,150,255,0.5)',
    background: 'rgba(100,150,255,0.08)',
    borderRadius: '0 3px 3px 0',
  },
  initLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#8af',
    marginBottom: 1,
  },
  initDetail: {
    fontSize: 9,
    color: '#aaa',
    fontFamily: 'monospace',
  },
  initEditRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  initEditLabel: {
    fontSize: 9,
    color: '#8af',
    minWidth: 50,
  },
  initNumInput: {
    width: 90,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(100,150,255,0.3)',
    color: '#fff',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 10,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  initUpdateBtn: {
    flex: 1,
    background: 'rgba(100,150,255,0.2)',
    border: '1px solid rgba(100,150,255,0.4)',
    color: '#8af',
    borderRadius: 4,
    padding: '3px 0',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 4px',
    fontSize: 10,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer',
  },
  eventRowEditing: {
    background: 'rgba(255,170,100,0.1)',
    borderLeft: '2px solid rgba(255,170,100,0.5)',
  },
  eventInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  eventIndex: {
    color: '#fa8',
    fontWeight: 600,
    fontSize: 9,
  },
  eventDate: {
    color: '#aaa',
    fontFamily: 'monospace',
    fontSize: 9,
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

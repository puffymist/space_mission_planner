import { useState, useEffect, useRef } from 'react';
import useCraftStore from '../state/useCraftStore.js';
import useSimStore from '../state/useSimStore.js';
import useUIStore from '../state/useUIStore.js';
import { FRAMES, PRESETS, computeDeltaV, circularizeDeltaV } from '../physics/deltaV.js';
import { interpolateState } from '../utils/interpolate.js';
import { getBodyPosition, getAllBodyPositions } from '../physics/bodyPosition.js';
import { nearestBody } from '../physics/gravity.js';
import { formatEpochMedium, formatVelocity, formatDistance, toDatetimeLocal, fromDatetimeLocal } from '../utils/time.js';
import BODIES, { BODY_MAP } from '../constants/bodies.js';

// Group color palette for epoch-linked groups
const GROUP_COLORS = ['#8af', '#fa8', '#8fa', '#f8a', '#a8f'];

function getGroupColors(craft) {
  const groups = new Map();
  if (craft.launchLinkedGroup) groups.set(craft.launchLinkedGroup, null);
  for (const ev of craft.events) {
    if (ev.linkedGroup && !groups.has(ev.linkedGroup)) groups.set(ev.linkedGroup, null);
  }
  let i = 0;
  for (const key of groups.keys()) {
    groups.set(key, GROUP_COLORS[i % GROUP_COLORS.length]);
    i++;
  }
  return groups;
}

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
      events: tempCraft.events.map(e => ({ epoch: e.epoch, dvx: e.dvx, dvy: e.dvy })),
    },
    duration,
    firstChunkDuration: Math.min(duration, 90 * 86400),
  });
}

// ------- Numeric input that tolerates intermediate states ("-", "-0.", etc.) -------
function NumericInput({ value, onChange, style, step, ...rest }) {
  const [text, setText] = useState(String(value));
  const prevValue = useRef(value);

  // Sync from external changes (slider, presets, etc.)
  useEffect(() => {
    if (value !== prevValue.current) {
      setText(String(value));
      prevValue.current = value;
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setText(raw);
    const n = Number(raw);
    if (raw.trim() !== '' && isFinite(n)) {
      prevValue.current = n;
      onChange(n);
    }
  };

  const handleBlur = () => {
    // Normalize display to current numeric value
    setText(String(value));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      style={style}
      {...rest}
    />
  );
}

// ------- Maneuver inline editor -------
function ManeuverEditor({ craft, eventIndex, onDone }) {
  const ev = craft.events[eventIndex];
  const updateDeltaV = useCraftStore((s) => s.updateDeltaV);
  const removeDeltaV = useCraftStore((s) => s.removeDeltaV);
  const linkEvents = useCraftStore((s) => s.linkEvents);
  const unlinkEvent = useCraftStore((s) => s.unlinkEvent);
  const joinGroup = useCraftStore((s) => s.joinGroup);
  const epoch = useSimStore((s) => s.epoch);

  // Restore from spec if available, else reverse-engineer
  const initFrame = ev.spec?.frame || 'inertial';
  const initAngle = ev.spec?.angle ?? (Math.atan2(ev.dvy, ev.dvx) * 180 / Math.PI);
  const initMag = ev.spec?.magnitude ?? Math.sqrt(ev.dvx * ev.dvx + ev.dvy * ev.dvy);
  const initRefBody = ev.spec?.refBody || 'earth';
  // For circularize: angle encodes sense (0=auto, 1=CCW, -1=CW)
  const initSense = ev.spec?.frame === 'circularize' ? (ev.spec?.angle || 0) : 0;

  const [frame, setFrame] = useState(initFrame);
  const [angle, setAngle] = useState(initAngle);
  const [magnitude, setMagnitude] = useState(initMag);
  const [refBody, setRefBody] = useState(initRefBody);
  const [circSense, setCircSense] = useState(initSense);
  const [editEpoch, setEditEpoch] = useState(ev.epoch);
  const [dvStep, setDvStep] = useState(100);
  const [linkTarget, setLinkTarget] = useState('launch');
  const debounceRef = useRef(null);

  // Live preview
  useEffect(() => {
    if (!craft || (frame !== 'circularize' && magnitude === 0)) {
      useUIStore.setState({ maneuverPreview: null });
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const craftState = interpolateState(craft.segments, editEpoch);
      if (!craftState) return;
      const effAngle = frame === 'circularize' ? circSense : angle;
      const effMag = frame === 'circularize' ? 0 : magnitude;
      const dv = computeDeltaV(frame, effAngle, effMag, craftState, refBody, editEpoch);
      const tempEvents = craft.events.map((e, i) =>
        i === eventIndex ? { epoch: editEpoch, dvx: dv.dvx, dvy: dv.dvy } : e
      );
      const tempCraft = { ...craft, events: tempEvents.sort((a, b) => a.epoch - b.epoch) };
      const bodyPositions = getAllBodyPositions(editEpoch);
      const { dist: nearDist } = nearestBody(craftState, bodyPositions);
      const previewDuration = nearDist < 5e7 ? 180 * 86400 : 2 * 365.25 * 86400;
      computePreviewAsync(tempCraft, previewDuration, (segments) => {
        useUIStore.setState({ maneuverPreview: { segments, color: craft.color } });
      });
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (previewWorker) { previewWorker.terminate(); previewWorker = null; }
    };
  }, [frame, angle, magnitude, refBody, circSense, editEpoch, craft?.id, eventIndex]);

  useEffect(() => () => useUIStore.setState({ maneuverPreview: null }), []);

  const handleUpdate = () => {
    const craftState = interpolateState(craft.segments, editEpoch);
    if (!craftState) return;
    const effAngle = frame === 'circularize' ? circSense : angle;
    const effMag = frame === 'circularize' ? 0 : magnitude;
    const dv = computeDeltaV(frame, effAngle, effMag, craftState, refBody, editEpoch);
    const spec = frame === 'circularize'
      ? { frame, angle: circSense, magnitude: 0, refBody }
      : { frame, angle, magnitude, refBody };
    updateDeltaV(craft.id, eventIndex, { epoch: editEpoch, dvx: dv.dvx, dvy: dv.dvy, spec });
    useUIStore.setState({ maneuverPreview: null });
    onDone();
  };

  const handleCancel = () => {
    useUIStore.setState({ maneuverPreview: null });
    onDone();
  };

  const handleDelete = () => {
    removeDeltaV(craft.id, eventIndex);
    useUIStore.setState({ maneuverPreview: null });
    onDone();
  };

  const maxMag = dvStep * 100;

  // Linked group info
  const linkedGroup = ev.linkedGroup;
  const linkedCount = linkedGroup
    ? craft.events.filter(e => e.linkedGroup === linkedGroup).length +
      (craft.launchLinkedGroup === linkedGroup ? 1 : 0)
    : 0;

  return (
    <div style={styles.editor}>
      <div style={styles.editRow}>
        <span style={styles.editLabel}>Epoch:</span>
        <input type="datetime-local" value={toDatetimeLocal(editEpoch)} step="1"
          style={styles.epochInput}
          onChange={(e) => { const t = fromDatetimeLocal(e.target.value); if (t !== null) setEditEpoch(t); }}
        />
        <button onClick={() => useSimStore.getState().setEpoch(editEpoch)}
          style={styles.goBtn} title="Jump to this epoch">Go</button>
      </div>
      <div style={styles.editRow}>
        <span style={styles.editLabel}>Frame:</span>
        <select value={frame} onChange={(e) => setFrame(e.target.value)} style={styles.select}>
          {FRAMES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>
      {(frame === 'body' || frame === 'velocity' || frame === 'circularize') && (
        <div style={styles.editRow}>
          <span style={styles.editLabel}>Ref:</span>
          <select value={refBody} onChange={(e) => setRefBody(e.target.value)} style={styles.select}>
            {BODIES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}
      {frame === 'circularize' && (
        <div style={styles.editRow}>
          <span style={styles.editLabel}>Sense:</span>
          <div style={styles.presetRow}>
            {[{ label: 'Auto', value: 0 }, { label: 'Pro (CCW)', value: 1 }, { label: 'Retro (CW)', value: -1 }].map(s => (
              <button key={s.value} onClick={() => setCircSense(s.value)}
                style={{ ...styles.presetBtn, ...(circSense === s.value ? styles.presetBtnActive : {}) }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {frame !== 'circularize' && <>
        <div style={styles.editRow}>
          <span style={styles.editLabel}>Angle:</span>
          <NumericInput value={angle}
            onChange={(n) => setAngle(n)} style={styles.angleInput} />
          <span style={styles.unitLabel}>°</span>
        </div>
        <div style={styles.presetRow}>
          {(PRESETS[frame] || []).map(p => (
            <button key={p.label} onClick={() => setAngle(p.angle)}
              style={{ ...styles.presetBtn, ...(angle === p.angle ? styles.presetBtnActive : {}) }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={styles.editRow}>
          <span style={styles.editLabel}>Mag:</span>
          <NumericInput value={magnitude}
            onChange={(n) => setMagnitude(Math.max(0, n))} style={styles.magInput} />
          <span style={styles.unitLabel}>m/s</span>
        </div>
        <input type="range" min={0} max={maxMag} step={dvStep}
          value={Math.min(magnitude, maxMag)}
          onChange={(e) => setMagnitude(Number(e.target.value))} style={styles.slider} />
        <div style={styles.presetRow}>
          {[1, 10, 100, 1000].map(s => (
            <button key={s} onClick={() => setDvStep(s)}
              style={{ ...styles.presetBtn, ...(dvStep === s ? styles.presetBtnActive : {}) }}>
              {s >= 1000 ? `${s / 1000}km/s` : `${s}m/s`}
            </button>
          ))}
        </div>
      </>}
      {/* Link controls */}
      <div style={styles.editRow}>
        <span style={styles.editLabel}>Link:</span>
        {linkedGroup ? (
          <span style={styles.linkInfo}>
            Group ({linkedCount})
            <button onClick={() => unlinkEvent(craft.id, eventIndex)} style={styles.unlinkBtn}>Unlink</button>
          </span>
        ) : (
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            <select value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)}
              style={{ ...styles.select, flex: 1 }}>
              <option value="launch">Launch</option>
              {craft.events.map((_, i) => i !== eventIndex && (
                <option key={i} value={`ev-${i}`}>#{i + 1}</option>
              ))}
            </select>
            <button onClick={() => {
              if (linkTarget === 'launch') {
                const existing = craft.launchLinkedGroup;
                if (existing) {
                  joinGroup(craft.id, eventIndex, existing);
                } else {
                  linkEvents(craft.id, [eventIndex], true);
                }
              } else {
                const targetIdx = parseInt(linkTarget.split('-')[1]);
                const existing = craft.events[targetIdx]?.linkedGroup;
                if (existing) {
                  joinGroup(craft.id, eventIndex, existing);
                } else {
                  linkEvents(craft.id, [eventIndex, targetIdx], false);
                }
              }
            }} style={styles.linkBtn}>Link</button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <button onClick={handleUpdate} style={styles.updateBtn}>Update</button>
        <button onClick={handleCancel} style={styles.cancelBtn}>Cancel</button>
        <button onClick={handleDelete} style={styles.deleteBtn}>Del</button>
      </div>
    </div>
  );
}

// ------- Launch inline editor -------
function LaunchEditor({ craft, onDone }) {
  const updateInitialState = useCraftStore((s) => s.updateInitialState);
  const linkEvents = useCraftStore((s) => s.linkEvents);
  const unlinkLaunch = useCraftStore((s) => s.unlinkLaunch);
  const joinLaunchToGroup = useCraftStore((s) => s.joinLaunchToGroup);

  const hasLaunchSpec = craft.launchDirection && craft.originBodyId && craft.orbitAltitude;

  const [initManual, setInitManual] = useState(false);
  const [initEpoch, setInitEpoch] = useState(craft.launchEpoch);
  const [linkTarget, setLinkTarget] = useState(craft.events.length > 0 ? 'ev-0' : '');
  const [initPhase, setInitPhase] = useState(craft.launchPhase || 0);
  const [initX, setInitX] = useState(craft.initialState.x / 1000);
  const [initY, setInitY] = useState(craft.initialState.y / 1000);
  const [initVx, setInitVx] = useState(craft.initialState.vx);
  const [initVy, setInitVy] = useState(craft.initialState.vy);

  const handleUpdate = () => {
    if (hasLaunchSpec && !initManual) {
      updateInitialState(craft.id, { launchEpoch: initEpoch, launchPhase: initPhase });
    } else {
      updateInitialState(craft.id, {
        launchEpoch: initEpoch,
        x: initX * 1000, y: initY * 1000, vx: initVx, vy: initVy,
      });
    }
    onDone();
  };

  const linkedGroup = craft.launchLinkedGroup;
  const linkedCount = linkedGroup
    ? craft.events.filter(e => e.linkedGroup === linkedGroup).length + 1
    : 0;

  return (
    <div style={styles.editor}>
      <div style={styles.editRow}>
        <span style={styles.editLabel}>Epoch:</span>
        <input type="datetime-local" value={toDatetimeLocal(initEpoch)} step="1"
          style={styles.epochInput}
          onChange={(e) => { const t = fromDatetimeLocal(e.target.value); if (t !== null) setInitEpoch(t); }}
        />
        <button onClick={() => useSimStore.getState().setEpoch(initEpoch)}
          style={styles.goBtn} title="Jump to this epoch">Go</button>
      </div>
      {hasLaunchSpec && !initManual ? (
        <>
          <div style={styles.specLine}>
            {BODY_MAP[craft.originBodyId]?.name} · {formatDistance(craft.orbitAltitude)} · {craft.launchDirection}
          </div>
          <div style={styles.editRow}>
            <span style={styles.editLabel}>Phase:</span>
            <NumericInput value={initPhase}
              onChange={(n) => setInitPhase(n)} style={styles.angleInput} />
            <span style={styles.unitLabel}>° CCW</span>
          </div>
          <div style={styles.manualLink} onClick={() => setInitManual(true)}>Edit state manually</div>
        </>
      ) : (
        <>
          {[['X (km)', initX, setInitX], ['Y (km)', initY, setInitY],
            ['Vx (m/s)', initVx, setInitVx], ['Vy (m/s)', initVy, setInitVy]].map(([label, val, setter]) => (
            <div key={label} style={styles.editRow}>
              <span style={styles.editLabel}>{label}:</span>
              <NumericInput value={val}
                onChange={(n) => setter(n)} style={styles.stateInput} />
            </div>
          ))}
        </>
      )}
      {/* Link controls */}
      <div style={styles.editRow}>
        <span style={styles.editLabel}>Link:</span>
        {linkedGroup ? (
          <span style={styles.linkInfo}>
            Group ({linkedCount})
            <button onClick={() => unlinkLaunch(craft.id)} style={styles.unlinkBtn}>Unlink</button>
          </span>
        ) : craft.events.length > 0 ? (
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            <select value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)}
              style={{ ...styles.select, flex: 1 }}>
              {craft.events.map((_, i) => (
                <option key={i} value={`ev-${i}`}>#{i + 1}</option>
              ))}
              <option value="all">All</option>
            </select>
            <button onClick={() => {
              if (linkTarget === 'all') {
                const allIndices = craft.events.map((_, i) => i);
                linkEvents(craft.id, allIndices, true);
              } else {
                const targetIdx = parseInt(linkTarget.split('-')[1]);
                const existing = craft.events[targetIdx]?.linkedGroup;
                if (existing) {
                  joinLaunchToGroup(craft.id, existing);
                } else {
                  linkEvents(craft.id, [targetIdx], true);
                }
              }
            }} style={styles.linkBtn}>Link</button>
          </div>
        ) : (
          <span style={styles.unitLabel}>No maneuvers</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <button onClick={handleUpdate} style={styles.updateBtn}>Update</button>
        <button onClick={onDone} style={styles.cancelBtn}>Cancel</button>
      </div>
    </div>
  );
}

// ------- Main panel -------
export default function DeltaVPanel() {
  const selectedCraftId = useCraftStore((s) => s.selectedCraftId);
  const crafts = useCraftStore((s) => s.crafts);
  const addDeltaV = useCraftStore((s) => s.addDeltaV);
  const epoch = useSimStore((s) => s.epoch);

  // expandedIndex: null=none, 0=launch, 1+=maneuver (1-indexed)
  const [expandedIndex, setExpandedIndex] = useState(null);

  const craft = crafts.find((c) => c.id === selectedCraftId);

  // Clear preview on unmount
  useEffect(() => {
    return () => useUIStore.setState({ maneuverPreview: null });
  }, []);

  // Reset expanded when craft changes
  useEffect(() => { setExpandedIndex(null); }, [selectedCraftId]);

  if (!craft) return null;

  const refBody = (() => {
    // Auto-detect nearest body for new maneuvers
    const craftState = interpolateState(craft.segments, epoch);
    if (!craftState) return 'earth';
    const bodyPositions = getAllBodyPositions(epoch);
    const { bodyId } = nearestBody(craftState, bodyPositions);
    return bodyId;
  })();

  const handleAddManeuver = () => {
    // Create a default prograde maneuver at current epoch
    const craftState = interpolateState(craft.segments, epoch);
    if (!craftState) return;
    const dv = computeDeltaV('velocity', 0, 1000, craftState, refBody, epoch);
    const spec = { frame: 'velocity', angle: 0, magnitude: 1000, refBody };
    addDeltaV(craft.id, epoch, dv.dvx, dv.dvy, spec);
    // Expand the newly added event (it'll be at some index after sort)
    const newEvents = [...craft.events, { epoch }].sort((a, b) => a.epoch - b.epoch);
    const newIndex = newEvents.findIndex(e => e.epoch === epoch && e === newEvents[newEvents.length - 1] || e.epoch === epoch);
    // Just expand the last one (simplest)
    setExpandedIndex(craft.events.length + 1); // 1-indexed
  };

  const handleCircularize = () => {
    const craftState = interpolateState(craft.segments, epoch);
    if (!craftState) return;
    const dv = circularizeDeltaV(craftState, refBody, epoch);
    const spec = { frame: 'circularize', angle: 0, magnitude: 0, refBody };
    addDeltaV(craft.id, epoch, dv.dvx, dv.dvy, spec);
  };

  const groupColors = getGroupColors(craft);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Maneuvers</div>

      {/* Event list */}
      <div style={styles.eventList}>
        {/* #0 Launch */}
        {(() => {
          const launchColor = craft.launchLinkedGroup ? groupColors.get(craft.launchLinkedGroup) : null;
          return (
            <div
              style={{
                ...styles.eventRow,
                ...(expandedIndex === 0 ? styles.eventRowActive : {}),
                ...(launchColor ? { borderLeftColor: launchColor } : {}),
              }}
              onClick={() => setExpandedIndex(expandedIndex === 0 ? null : 0)}
            >
              <span style={styles.eventIdx}>#0</span>
              <div style={styles.eventInfo}>
                <span style={styles.eventLabel}>Launch</span>
                <span style={styles.eventDetail}>{formatEpochMedium(craft.launchEpoch)}</span>
                <span style={styles.eventDetail}>
                  {BODY_MAP[craft.originBodyId]?.name || craft.originBodyId}
                  {craft.orbitAltitude ? ` · ${formatDistance(craft.orbitAltitude)}` : ''}
                  {craft.launchPhase ? ` · ${craft.launchPhase}°` : ''}
                </span>
              </div>
              {launchColor && <span style={{ ...styles.linkDot, background: launchColor }} title="Epoch-linked" />}
            </div>
          );
        })()}
        {expandedIndex === 0 && (
          <LaunchEditor craft={craft} onDone={() => setExpandedIndex(null)} />
        )}

        {/* Maneuvers */}
        {craft.events.map((ev, i) => {
          const dvMag = Math.sqrt(ev.dvx * ev.dvx + ev.dvy * ev.dvy);
          const idx = i + 1; // 1-indexed in expandedIndex
          const isExpanded = expandedIndex === idx;
          const evColor = ev.linkedGroup ? groupColors.get(ev.linkedGroup) : null;
          return (
            <div key={i}>
              <div
                style={{
                  ...styles.eventRow,
                  ...(isExpanded ? styles.eventRowActive : {}),
                  ...(evColor && !isExpanded ? { borderLeftColor: evColor } : {}),
                }}
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
              >
                <span style={styles.eventIdx}>#{idx}</span>
                <div style={styles.eventInfo}>
                  <span style={styles.eventDetail}>{formatEpochMedium(ev.epoch)}</span>
                  {ev.spec && (
                    <span style={styles.eventDetail}>
                      {ev.spec.frame === 'circularize'
                        ? `${BODY_MAP[ev.spec.refBody]?.name || ev.spec.refBody} Circ.${ev.spec.angle === 1 ? ' CCW' : ev.spec.angle === -1 ? ' CW' : ''}`
                        : <>
                            {ev.spec.frame === 'body' || ev.spec.frame === 'velocity' ? `${BODY_MAP[ev.spec.refBody]?.name || ev.spec.refBody || 'Sun'} ` : ''}
                            {FRAMES.find(f => f.id === ev.spec.frame)?.label || ev.spec.frame} {ev.spec.angle}°
                          </>
                      }
                    </span>
                  )}
                </div>
                <span style={styles.eventDv}>{formatVelocity(dvMag)}</span>
                {evColor && <span style={{ ...styles.linkDot, background: evColor }} title="Epoch-linked" />}
              </div>
              {isExpanded && (
                <ManeuverEditor
                  craft={craft}
                  eventIndex={i}
                  onDone={() => setExpandedIndex(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Add buttons */}
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        <button onClick={handleAddManeuver} style={styles.addBtn}>+ Add Maneuver</button>
        <button onClick={handleCircularize} style={styles.circBtn}
          title={`Circularize around ${BODY_MAP[refBody]?.name}`}>
          Circ.
        </button>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    width: 260,
    background: 'rgba(10, 10, 30, 0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: 8,
    backdropFilter: 'blur(8px)',
    pointerEvents: 'auto',
    flex: 1,
    minHeight: 0,
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
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 4px',
    borderRadius: 3,
    cursor: 'pointer',
    borderLeftWidth: 2,
    borderLeftStyle: 'solid',
    borderLeftColor: 'transparent',
  },
  eventRowActive: {
    background: 'rgba(255,170,100,0.08)',
    borderLeftColor: 'rgba(255,170,100,0.5)',
  },
  eventIdx: {
    fontSize: 9,
    fontWeight: 600,
    color: '#fa8',
    minWidth: 18,
  },
  eventInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  eventLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#8af',
  },
  eventDetail: {
    fontSize: 9,
    color: '#aaa',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  eventDv: {
    fontSize: 10,
    color: '#fa8',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
  },
  linkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    background: '#8af',
    flexShrink: 0,
  },
  editor: {
    padding: '6px 4px 6px 20px',
    borderLeftWidth: 2,
    borderLeftStyle: 'solid',
    borderLeftColor: 'rgba(255,170,100,0.3)',
    marginBottom: 2,
  },
  editRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  editLabel: {
    fontSize: 9,
    color: '#888',
    minWidth: 30,
  },
  epochInput: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 10,
    fontFamily: 'monospace',
    flex: 1,
    minWidth: 0,
  },
  goBtn: {
    background: 'rgba(100,150,255,0.2)',
    border: '1px solid rgba(100,150,255,0.4)',
    color: '#8af',
    borderRadius: 3,
    padding: '2px 5px',
    fontSize: 9,
    cursor: 'pointer',
    fontWeight: 600,
    flexShrink: 0,
  },
  select: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 10,
    flex: 1,
    minWidth: 0,
  },
  angleInput: {
    width: 52,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 10,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  magInput: {
    width: 60,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 10,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  stateInput: {
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
  unitLabel: {
    fontSize: 9,
    color: '#888',
  },
  presetRow: {
    display: 'flex',
    gap: 3,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  presetBtn: {
    background: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.15)',
    color: '#aaa',
    borderRadius: 3,
    padding: '1px 5px',
    fontSize: 8,
    cursor: 'pointer',
  },
  presetBtnActive: {
    background: 'rgba(255,170,100,0.2)',
    borderColor: 'rgba(255,170,100,0.5)',
    color: '#fa8',
  },
  slider: {
    width: '100%',
    height: 4,
    cursor: 'pointer',
    accentColor: '#fa8',
    marginBottom: 4,
  },
  specLine: {
    fontSize: 9,
    color: '#aaa',
    fontFamily: 'monospace',
    marginBottom: 3,
    paddingLeft: 40,
  },
  manualLink: {
    fontSize: 8,
    color: '#888',
    cursor: 'pointer',
    paddingLeft: 40,
    marginBottom: 3,
    textDecoration: 'underline',
  },
  linkInfo: {
    fontSize: 9,
    color: '#8af',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  linkBtn: {
    background: 'rgba(100,150,255,0.15)',
    border: '1px solid rgba(100,150,255,0.3)',
    color: '#8af',
    borderRadius: 3,
    padding: '1px 6px',
    fontSize: 8,
    cursor: 'pointer',
  },
  unlinkBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#aaa',
    borderRadius: 3,
    padding: '0px 4px',
    fontSize: 8,
    cursor: 'pointer',
  },
  updateBtn: {
    flex: 1,
    background: 'rgba(255,170,100,0.2)',
    border: '1px solid rgba(255,170,100,0.4)',
    color: '#fa8',
    borderRadius: 4,
    padding: '3px 0',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#aaa',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 10,
    cursor: 'pointer',
  },
  deleteBtn: {
    background: 'rgba(255,50,50,0.2)',
    border: '1px solid rgba(255,50,50,0.3)',
    color: '#f66',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 10,
    cursor: 'pointer',
  },
  addBtn: {
    flex: 1,
    background: 'rgba(255,170,100,0.2)',
    border: '1px solid rgba(255,170,100,0.4)',
    color: '#fa8',
    borderRadius: 4,
    padding: '4px 0',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
  },
  circBtn: {
    background: 'rgba(100,200,150,0.15)',
    border: '1px solid rgba(100,200,150,0.3)',
    color: '#6c8',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 10,
    cursor: 'pointer',
  },
};

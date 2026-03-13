import { useState, useRef } from 'react';
import useSimStore from '../state/useSimStore.js';
import useCameraStore from '../state/useCameraStore.js';
import useCraftStore from '../state/useCraftStore.js';
import { BODY_MAP } from '../constants/bodies.js';
import { toDatetimeLocal, fromDatetimeLocal } from '../utils/time.js';
import { exportMission, importMission } from '../utils/exportFormat.js';

const DOCS = '../docs/';

const SPEED_PRESETS = [
  { label: '-1 yr', value: -365.25 * 86400 },
  { label: '-30 d', value: -30 * 86400 },
  { label: '-7 d', value: -7 * 86400 },
  { label: '-1 d', value: -86400 },
  { label: '-6 hr', value: -21600 },
  { label: '-1 hr', value: -3600 },
  // speeds finer than 1 hr causes lag, probably because of the huge numbers of interval markers on orbits (ticks) and on trajectories (dots)
  /*
  { label: '-1 min', value: -60 },
  { label: '-1 s', value: -1 },
  { label: '1 s', value: 1 },
  { label: '1 min', value: 60 },
  */
  { label: '1 hr', value: 3600 },
  { label: '6 hr', value: 21600 },
  { label: '1 d', value: 86400 },
  { label: '7 d', value: 7 * 86400 },
  { label: '30 d', value: 30 * 86400 },
  { label: '1 yr', value: 365.25 * 86400 },
];

export default function TopBar() {
  const epoch = useSimStore((s) => s.epoch);
  const playing = useSimStore((s) => s.playing);
  const speed = useSimStore((s) => s.speed);
  const epochStep = useSimStore((s) => s.epochStep);
  const togglePlay = useSimStore((s) => s.togglePlay);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const setEpoch = useSimStore((s) => s.setEpoch);
  const bookmarks = useSimStore((s) => s.bookmarks);
  const addBookmark = useSimStore((s) => s.addBookmark);
  const updateBookmark = useSimStore((s) => s.updateBookmark);
  const removeBookmark = useSimStore((s) => s.removeBookmark);
  const sortBookmarks = useSimStore((s) => s.sortBookmarks);
  const frameType = useCameraStore((s) => s.frameType);
  const trackTarget = useCameraStore((s) => s.trackTarget);
  const trackType = useCameraStore((s) => s.trackType);
  const toggleFrame = useCameraStore((s) => s.toggleFrame);

  // Epoch slider state
  const [isDragging, setIsDragging] = useState(false);
  const dragCenterRef = useRef(0);
  const halfRange = epochStep * 500;
  const center = isDragging ? dragCenterRef.current : Math.round(epoch / epochStep) * epochStep;
  const sliderMin = center - halfRange;
  const sliderMax = center + halfRange;

  const handleSliderMouseDown = () => {
    dragCenterRef.current = Math.round(epoch / epochStep) * epochStep;
    setIsDragging(true);
  };
  const handleSliderMouseUp = () => setIsDragging(false);

  // Import/Export
  const fileInputRef = useRef(null);
  const handleExport = () => {
    const crafts = useCraftStore.getState().crafts;
    const { epoch: ep, bookmarks: bm } = useSimStore.getState();
    const json = exportMission(crafts, ep, bm);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = () => fileInputRef.current?.click();
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = importMission(ev.target.result);
        if (data.epoch !== undefined) useSimStore.setState({ epoch: data.epoch });
        useSimStore.setState({ bookmarks: data.bookmarks || [] });
        const newCrafts = data.crafts.map((c, i) => ({
          id: Date.now() + i,
          name: c.name || `Imported ${i + 1}`,
          color: c.color || '#44aaff',
          originBodyId: c.originBodyId || 'earth',
          launchEpoch: c.launchEpoch,
          orbitAltitude: c.orbitAltitude || null,
          launchDirection: c.launchDirection || null,
          launchPhase: c.launchPhase || 0,
          launchLinkedGroup: c.launchLinkedGroup || undefined,
          initialState: c.initialState,
          events: (c.events || []).map(ev2 => ({
            epoch: ev2.epoch, dvx: ev2.dvx, dvy: ev2.dvy,
            ...(ev2.spec ? { spec: ev2.spec } : {}),
            ...(ev2.linkedGroup ? { linkedGroup: ev2.linkedGroup } : {}),
          })),
          segments: [],
        }));
        useCraftStore.setState({
          crafts: newCrafts,
          selectedCraftId: newCrafts.length > 0 ? newCrafts[0].id : null,
        });
        useCraftStore.getState().recomputeAll();
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Rotating frame only available when tracking a non-Sun body with a parent
  const canRotate = trackTarget && trackType === 'body' && trackTarget !== 'sun' && BODY_MAP[trackTarget]?.parent;

  return (
    <div style={styles.wrapper}>
      {/* Row 1: controls */}
      <div style={styles.row1}>
        <input
          type="datetime-local"
          value={toDatetimeLocal(epoch)}
          step="1"
          onChange={(e) => { const t = fromDatetimeLocal(e.target.value); if (t !== null) setEpoch(t); }}
          style={styles.epochInput}
          title="Current simulation epoch (live)"
        />
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

        {/* Epoch bookmarks */}
        <div style={styles.bookmarkContainer}>
          {bookmarks.map((bm, i) => (
            <div key={i} style={styles.bookmarkSlot} title={bm.label || undefined}>
              <input
                type="datetime-local"
                value={toDatetimeLocal(bm.epoch)}
                step="1"
                onChange={(e) => { const t = fromDatetimeLocal(e.target.value); if (t !== null) updateBookmark(i, { epoch: t }); }}
                onBlur={sortBookmarks}
                style={styles.bookmarkInput}
              />
              <button
                onClick={() => setEpoch(bm.epoch)}
                style={styles.goBtn}
                title="Jump to this epoch"
              >Go</button>
              <button
                onClick={() => removeBookmark(i)}
                style={styles.removeBtn}
                title="Remove bookmark"
              >×</button>
            </div>
          ))}
          <button
            onClick={addBookmark}
            style={styles.addBookmarkBtn}
            title="Bookmark current epoch"
          >＋</button>
        </div>

        {canRotate && (
          <button
            onClick={toggleFrame}
            style={frameType === 'rotating' ? styles.frameActive : styles.frameBtn}
            title="Toggle rotating reference frame (R)"
          >
            {frameType === 'rotating' ? 'Rotating' : 'Inertial'}
          </button>
        )}
        <button onClick={handleExport} style={styles.ioBtn} title="Export mission as JSON">Export</button>
        <button onClick={handleImport} style={styles.ioBtn} title="Import mission from JSON">Import</button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
        <a href={DOCS} target="_blank" rel="noopener noreferrer" style={styles.docsLink}
          title="Open documentation">Docs</a>
      </div>

      {/* Row 2: epoch slider */}
      <div style={styles.row2}>
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={epochStep}
          value={Math.max(sliderMin, Math.min(sliderMax, epoch))}
          onChange={(e) => setEpoch(Number(e.target.value))}
          onMouseDown={handleSliderMouseDown}
          onMouseUp={handleSliderMouseUp}
          style={styles.slider}
        />
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    background: 'rgba(10, 10, 26, 0.85)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'auto',
  },
  row1: {
    height: 36,
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 8,
  },
  row2: {
    height: 20,
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
  },
  btn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 4,
    padding: '1px 10px',
    fontSize: 14,
    cursor: 'pointer',
    flexShrink: 0,
  },
  select: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 4,
    padding: '2px 6px',
    fontSize: 12,
    flexShrink: 0,
  },
  epochInput: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(100,150,255,0.4)',
    color: '#fff',
    borderRadius: 4,
    padding: '3px 6px',
    fontSize: 12,
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  bookmarkContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
    flex: 1,
    minWidth: 0,
  },
  bookmarkSlot: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  bookmarkInput: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#ccc',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: 10,
    fontFamily: 'monospace',
    width: 148,
  },
  goBtn: {
    background: 'rgba(100,150,255,0.2)',
    border: '1px solid rgba(100,150,255,0.4)',
    color: '#8af',
    borderRadius: 3,
    padding: '2px 5px',
    fontSize: 10,
    cursor: 'pointer',
    fontWeight: 600,
  },
  removeBtn: {
    background: 'rgba(200,50,50,0.2)',
    border: '1px solid rgba(200,50,50,0.3)',
    color: '#f66',
    borderRadius: 3,
    padding: '0 5px',
    fontSize: 14,
    cursor: 'pointer',
  },
  addBookmarkBtn: {
    background: 'rgba(100,150,255,0.2)',
    border: '1px solid rgba(100,150,255,0.4)',
    color: '#888',
    borderRadius: 0,
    padding: '1px 6px',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    flexShrink: 0,
  },
  slider: {
    flex: 1,
    height: 4,
    cursor: 'pointer',
    accentColor: '#6af',
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
    flexShrink: 0,
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
    flexShrink: 0,
  },
  ioBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#aaa',
    borderRadius: 3,
    padding: '2px 8px',
    fontSize: 12,
    cursor: 'pointer',
    flexShrink: 0,
  },
  docsLink: {
    color: '#8bf',
    fontSize: 14,
    padding: '1px 4px',
    textDecoration: 'underline',
    flexShrink: 0,
  },
};

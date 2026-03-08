import { useRef } from 'react';
import useCraftStore from '../state/useCraftStore.js';
import useSimStore from '../state/useSimStore.js';
import { exportMission, importMission } from '../utils/exportFormat.js';
import { computeTrajectory } from '../physics/trajectory.js';

export default function ImportExport() {
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const crafts = useCraftStore.getState().crafts;
    const epoch = useSimStore.getState().epoch;
    const json = exportMission(crafts, epoch);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = importMission(ev.target.result);

        // Set epoch
        if (data.epoch !== undefined) {
          useSimStore.setState({ epoch: data.epoch });
        }

        // Reconstruct crafts with computed trajectories
        const newCrafts = data.crafts.map((c, i) => {
          const craft = {
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
            events: (c.events || []).map(e => ({
              epoch: e.epoch, dvx: e.dvx, dvy: e.dvy,
              ...(e.spec ? { spec: e.spec } : {}),
              ...(e.linkedGroup ? { linkedGroup: e.linkedGroup } : {}),
            })),
            segments: null,
          };
          craft.segments = computeTrajectory(craft);
          return craft;
        });

        useCraftStore.setState({
          crafts: newCrafts,
          selectedCraftId: newCrafts.length > 0 ? newCrafts[0].id : null,
        });
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);

    // Reset file input so the same file can be re-imported
    e.target.value = '';
  };

  return (
    <div style={styles.container}>
      <button onClick={handleExport} style={styles.btn} title="Export mission as JSON">
        Export
      </button>
      <button onClick={handleImport} style={styles.btn} title="Import mission from JSON">
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 8,
    left: '50%',
    transform: 'translateX(120px)',
    display: 'flex',
    gap: 4,
    zIndex: 10,
  },
  btn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#aaa',
    borderRadius: 3,
    padding: '2px 10px',
    fontSize: 11,
    cursor: 'pointer',
  },
};

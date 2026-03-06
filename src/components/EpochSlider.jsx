import { useState, useRef } from 'react';
import useSimStore from '../state/useSimStore.js';
import FinenessControl from './FinenessControl.jsx';

export default function EpochSlider() {
  const epoch = useSimStore((s) => s.epoch);
  const setEpoch = useSimStore((s) => s.setEpoch);
  const epochStep = useSimStore((s) => s.epochStep);
  const setEpochStep = useSimStore((s) => s.setEpochStep);
  const [customStepStr, setCustomStepStr] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const dragCenterRef = useRef(0);

  // Dynamic range: 500 steps each direction from center
  const halfRange = epochStep * 500;
  // Freeze center during drag to prevent range shifting under the thumb
  const center = isDragging ? dragCenterRef.current : Math.round(epoch / epochStep) * epochStep;
  const min = center - halfRange;
  const max = center + halfRange;

  const handleMouseDown = () => {
    dragCenterRef.current = Math.round(epoch / epochStep) * epochStep;
    setIsDragging(true);
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleStepChange = (val) => {
    setEpochStep(val);
    setCustomStepStr('');
  };

  const handleCustomStep = () => {
    const v = Number(customStepStr);
    if (v > 0) setEpochStep(v);
  };

  return (
    <div style={styles.container}>
      <input
        type="range"
        min={min}
        max={max}
        step={epochStep}
        value={Math.max(min, Math.min(max, epoch))}
        onChange={(e) => setEpoch(Number(e.target.value))}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={styles.slider}
      />
      <FinenessControl value={epochStep} onChange={handleStepChange} />
      <input
        type="number"
        value={customStepStr}
        onChange={(e) => setCustomStepStr(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleCustomStep(); }}
        placeholder="sec"
        title="Custom step (seconds)"
        style={styles.customStep}
      />
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    background: 'rgba(10, 10, 26, 0.85)',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: 12,
    zIndex: 10,
    backdropFilter: 'blur(8px)',
  },
  slider: {
    flex: 1,
    height: 4,
    cursor: 'pointer',
    accentColor: '#6af',
  },
  customStep: {
    width: 50,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 3,
    padding: '1px 4px',
    fontSize: 10,
    textAlign: 'right',
  },
};

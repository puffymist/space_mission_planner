import { useState } from 'react';
import useSimStore from '../state/useSimStore.js';
import FinenessControl from './FinenessControl.jsx';

// Default range: J2000 +/- 50 years
const FIFTY_YEARS = 50 * 365.25 * 86400;

export default function EpochSlider() {
  const epoch = useSimStore((s) => s.epoch);
  const setEpoch = useSimStore((s) => s.setEpoch);
  const [step, setStep] = useState(86400); // default: 1 day

  // Range centers on 0 (J2000) +/- 50 years
  const min = -FIFTY_YEARS;
  const max = FIFTY_YEARS;

  return (
    <div style={styles.container}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.max(min, Math.min(max, epoch))}
        onChange={(e) => setEpoch(Number(e.target.value))}
        style={styles.slider}
      />
      <FinenessControl value={step} onChange={setStep} />
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
};

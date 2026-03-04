const LEVELS = [
  { label: '1 min', value: 60 },
  { label: '1 hr', value: 3600 },
  { label: '1 day', value: 86400 },
  { label: '7 days', value: 7 * 86400 },
  { label: '30 days', value: 30 * 86400 },
  { label: '1 yr', value: 365.25 * 86400 },
];

export default function FinenessControl({ value, onChange }) {
  return (
    <div style={styles.container}>
      <span style={styles.label}>Step:</span>
      {LEVELS.map((l) => (
        <button
          key={l.value}
          onClick={() => onChange(l.value)}
          style={{
            ...styles.btn,
            ...(value === l.value ? styles.btnActive : {}),
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: '#888',
    marginRight: 4,
  },
  btn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#aaa',
    borderRadius: 3,
    padding: '1px 6px',
    fontSize: 10,
    cursor: 'pointer',
  },
  btnActive: {
    background: 'rgba(100,150,255,0.2)',
    borderColor: 'rgba(100,150,255,0.5)',
    color: '#8af',
  },
};

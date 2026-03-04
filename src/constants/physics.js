// Gravitational constant (m^3 kg^-1 s^-2)
export const G = 6.6743e-11;

// 1 Astronomical Unit in meters
export const AU = 1.496e11;

// J2000.0 epoch: 2000-01-01T12:00:00Z as Unix milliseconds
export const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

// J2000.0 as seconds since Unix epoch
export const J2000_S = J2000_MS / 1000;

// Convert a JS Date (or ms timestamp) to seconds since J2000
export function dateToJ2000(dateOrMs) {
  const ms = typeof dateOrMs === 'number' ? dateOrMs : dateOrMs.getTime();
  return (ms - J2000_MS) / 1000;
}

// Convert seconds since J2000 to a JS Date
export function j2000ToDate(t) {
  return new Date(J2000_MS + t * 1000);
}

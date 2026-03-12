import { J2000_MS, j2000ToDate, dateToJ2000 } from '../constants/physics.js';

// Format seconds-since-J2000 as a human-readable datetime string
export function formatEpoch(t) {
  const date = new Date(J2000_MS + t * 1000);
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

// Format seconds-since-J2000 as a short date (YYYY-MM-DD)
export function formatEpochShort(t) {
  const date = new Date(J2000_MS + t * 1000);
  return date.toISOString().slice(0, 10);
}

// Format seconds-since-J2000 as YYYY-MM-DD HH:mm:ss (no timezone, compact)
export function formatEpochMedium(t) {
  const date = new Date(J2000_MS + t * 1000);
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

// Format a duration in seconds as a human-readable string
export function formatDuration(seconds) {
  const abs = Math.abs(seconds);
  if (abs < 60) return `${seconds.toFixed(1)}s`;
  if (abs < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (abs < 86400) return `${(seconds / 3600).toFixed(1)} hr`;
  if (abs < 86400 * 365.25) return `${(seconds / 86400).toFixed(1)} days`;
  return `${(seconds / (86400 * 365.25)).toFixed(2)} yr`;
}

// Format velocity in appropriate units
export function formatVelocity(ms) {
  if (Math.abs(ms) < 1000) return `${ms.toFixed(1)} m/s`;
  return `${(ms / 1000).toFixed(2)} km/s`;
}

// Convert J2000 seconds to datetime-local input value string
export function toDatetimeLocal(t) {
  const d = j2000ToDate(t);
  return isNaN(d.getTime()) ? '2000-01-01T12:00:00' : d.toISOString().slice(0, 19);
}

// Parse datetime-local input value string to J2000 seconds (null if invalid)
export function fromDatetimeLocal(val) {
  const d = new Date(val + 'Z');
  return isNaN(d.getTime()) ? null : dateToJ2000(d);
}

// Format distance in appropriate units
export function formatDistance(meters) {
  const abs = Math.abs(meters);
  if (abs < 1e6) return `${(meters / 1000).toFixed(1)} km`;
  if (abs < 1e9) return `${(meters / 1e6).toFixed(1)} Mm`;
  if (abs < 1e12) return `${(meters / 1.496e11).toFixed(3)} AU`;
  return `${(meters / 1.496e11).toFixed(1)} AU`;
}

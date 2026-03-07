// Export/import spacecraft missions as JSON
// Only stores initial state + delta-v events (trajectories are recomputed on import)

const FORMAT_VERSION = 1;

export function exportMission(crafts, epoch) {
  return JSON.stringify({
    version: FORMAT_VERSION,
    epoch,
    crafts: crafts.map(c => ({
      name: c.name,
      color: c.color,
      originBodyId: c.originBodyId,
      launchEpoch: c.launchEpoch,
      orbitAltitude: c.orbitAltitude || null,
      launchDirection: c.launchDirection || null,
      initialState: c.initialState,
      events: c.events.map(e => ({
        epoch: e.epoch,
        dvx: e.dvx,
        dvy: e.dvy,
      })),
    })),
  }, null, 2);
}

export function validateMission(json) {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data.version || !Array.isArray(data.crafts)) {
      return { valid: false, error: 'Invalid format: missing version or crafts array' };
    }
    for (const c of data.crafts) {
      if (!c.initialState || typeof c.initialState.x !== 'number') {
        return { valid: false, error: `Invalid craft "${c.name}": missing initialState` };
      }
      if (!Array.isArray(c.events)) {
        return { valid: false, error: `Invalid craft "${c.name}": missing events array` };
      }
    }
    return { valid: true, data };
  } catch (e) {
    return { valid: false, error: `JSON parse error: ${e.message}` };
  }
}

export function importMission(json) {
  const result = validateMission(json);
  if (!result.valid) throw new Error(result.error);
  return result.data;
}

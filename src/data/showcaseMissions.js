const modules = import.meta.glob('./showcase/*.json', { eager: true });

export const SHOWCASE_MISSIONS = Object.entries(modules).map(([path, mod]) => ({
  label: mod.default.label ?? path.replace(/.*\//, '').replace('.json', ''),
  data: mod.default,
}));

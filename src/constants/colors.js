// Visual properties for each body
const BODY_VISUALS = {
  sun:      { color: '#FDB813', radius: 8, labelOffset: 12 },
  mercury:  { color: '#B5B5B5', radius: 3, labelOffset: 8 },
  venus:    { color: '#E8CDA0', radius: 4, labelOffset: 8 },
  earth:    { color: '#6B93D6', radius: 4, labelOffset: 8 },
  mars:     { color: '#C1440E', radius: 3.5, labelOffset: 8 },
  jupiter:  { color: '#C88B3A', radius: 6, labelOffset: 10 },
  saturn:   { color: '#E8D191', radius: 5.5, labelOffset: 10 },
  uranus:   { color: '#D1E7E7', radius: 5, labelOffset: 10 },
  neptune:  { color: '#5B5DDF', radius: 5, labelOffset: 10 },
  moon:     { color: '#AAAAAA', radius: 2.5, labelOffset: 6 },
  io:       { color: '#F5E663', radius: 2.5, labelOffset: 6 },
  europa:   { color: '#ADB5BD', radius: 2.5, labelOffset: 6 },
  ganymede: { color: '#8B7355', radius: 3, labelOffset: 6 },
  callisto: { color: '#6B6B6B', radius: 2.5, labelOffset: 6 },
  titan:    { color: '#E0A030', radius: 3, labelOffset: 6 },
  triton:   { color: '#D4C5A9', radius: 2.5, labelOffset: 6 },
};

// Orbit line colors (dimmer versions of body colors)
const ORBIT_VISUALS = {
  sun:      { color: 'transparent', width: 0 },
  mercury:  { color: 'rgba(181,181,181,0.3)', width: 1 },
  venus:    { color: 'rgba(232,205,160,0.3)', width: 1 },
  earth:    { color: 'rgba(107,147,214,0.3)', width: 1 },
  mars:     { color: 'rgba(193,68,14,0.3)',   width: 1 },
  jupiter:  { color: 'rgba(200,139,58,0.3)',  width: 1 },
  saturn:   { color: 'rgba(232,209,145,0.3)', width: 1 },
  uranus:   { color: 'rgba(209,231,231,0.3)', width: 1 },
  neptune:  { color: 'rgba(91,93,223,0.3)',   width: 1 },
  moon:     { color: 'rgba(170,170,170,0.25)', width: 0.5 },
  io:       { color: 'rgba(245,230,99,0.25)',  width: 0.5 },
  europa:   { color: 'rgba(173,181,189,0.25)', width: 0.5 },
  ganymede: { color: 'rgba(139,115,85,0.25)',  width: 0.5 },
  callisto: { color: 'rgba(107,107,107,0.25)', width: 0.5 },
  titan:    { color: 'rgba(224,160,48,0.25)',  width: 0.5 },
  triton:   { color: 'rgba(212,197,169,0.25)', width: 0.5 },
};

export { BODY_VISUALS, ORBIT_VISUALS };

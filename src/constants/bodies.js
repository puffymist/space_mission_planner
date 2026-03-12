import { AU } from './physics.js';

// Mean longitudes at J2000.0 (radians, approximate)
// Sources: JPL planetary ephemerides, simplified
const DEG = Math.PI / 180;

const BODIES = [
  // Sun
  {
    id: 'sun',
    name: 'Sun',
    mass: 1.989e30,
    parent: null,
    orbitalRadius: 0,
    orbitalPeriod: 0,
    initialAngle: 0,
  },

  // Planets (orbiting Sun)
  {
    id: 'mercury',
    name: 'Mercury',
    mass: 3.301e23,
    parent: 'sun',
    orbitalRadius: 0.387 * AU,
    orbitalPeriod: 87.969 * 86400,
    initialAngle: 252.25 * DEG,
  },
  {
    id: 'venus',
    name: 'Venus',
    mass: 4.867e24,
    parent: 'sun',
    orbitalRadius: 0.723 * AU,
    orbitalPeriod: 224.701 * 86400,
    initialAngle: 181.98 * DEG,
  },
  {
    id: 'earth',
    name: 'Earth',
    mass: 5.972e24,
    parent: 'sun',
    orbitalRadius: 1.0 * AU,
    orbitalPeriod: 365.256 * 86400,
    initialAngle: 100.46 * DEG,
  },
  {
    id: 'mars',
    name: 'Mars',
    mass: 6.417e23,
    parent: 'sun',
    orbitalRadius: 1.524 * AU,
    orbitalPeriod: 686.98 * 86400,
    initialAngle: 355.45 * DEG,
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    mass: 1.898e27,
    parent: 'sun',
    orbitalRadius: 5.203 * AU,
    orbitalPeriod: 4332.59 * 86400,
    initialAngle: 34.40 * DEG,
  },
  {
    id: 'saturn',
    name: 'Saturn',
    mass: 5.683e26,
    parent: 'sun',
    orbitalRadius: 9.537 * AU,
    orbitalPeriod: 10759.22 * 86400,
    initialAngle: 49.94 * DEG,
  },
  {
    id: 'uranus',
    name: 'Uranus',
    mass: 8.681e25,
    parent: 'sun',
    orbitalRadius: 19.19 * AU,
    orbitalPeriod: 30688.5 * 86400,
    initialAngle: 313.23 * DEG,
  },
  {
    id: 'neptune',
    name: 'Neptune',
    mass: 1.024e26,
    parent: 'sun',
    orbitalRadius: 30.07 * AU,
    orbitalPeriod: 60182.0 * 86400,
    initialAngle: 304.88 * DEG,
  },

  // Earth's Moon
  {
    id: 'moon',
    name: 'Moon',
    mass: 7.346e22,
    parent: 'earth',
    orbitalRadius: 3.844e8,
    orbitalPeriod: 27.321661 * 86400,
    initialAngle: 223.32 * DEG,
  },

  // Jupiter's Galilean moons
  {
    id: 'io',
    name: 'Io',
    mass: 8.932e22,
    parent: 'jupiter',
    orbitalRadius: 4.217e8,
    orbitalPeriod: 1.769137786 * 86400,
    initialAngle: 17.92 * DEG,
  },
  {
    id: 'europa',
    name: 'Europa',
    mass: 4.800e22,
    parent: 'jupiter',
    orbitalRadius: 6.711e8,
    orbitalPeriod: 3.551181041 * 86400,
    initialAngle: 212.39 * DEG,
  },
  {
    id: 'ganymede',
    name: 'Ganymede',
    mass: 1.482e23,
    parent: 'jupiter',
    orbitalRadius: 1.070e9,
    orbitalPeriod: 7.15455296 * 86400,
    initialAngle: 219.84 * DEG,
  },
  {
    id: 'callisto',
    name: 'Callisto',
    mass: 1.076e23,
    parent: 'jupiter',
    orbitalRadius: 1.883e9,
    orbitalPeriod: 16.6890184 * 86400,
    initialAngle: 80.05 * DEG,
  },

  // Saturn's Titan
  {
    id: 'titan',
    name: 'Titan',
    mass: 1.345e23,
    parent: 'saturn',
    orbitalRadius: 1.222e9,
    orbitalPeriod: 15.945421 * 86400,
    initialAngle: 141.00 * DEG,
  },

  // Neptune's Triton (RETROGRADE: negative period encodes clockwise orbit)
  /*
  {
    id: 'triton',
    name: 'Triton',
    mass: 2.14e22,
    parent: 'neptune',
    orbitalRadius: 3.548e8,
    orbitalPeriod: -5.877 * 86400, // negative = retrograde
    initialAngle: 0,
  },
  */
];

// Precompute angular velocity for each body
for (const body of BODIES) {
  if (body.orbitalPeriod !== 0) {
    body.angularVelocity = (2 * Math.PI) / body.orbitalPeriod;
  } else {
    body.angularVelocity = 0;
  }
}

export default BODIES;

// Lookup maps
export const BODY_MAP = Object.fromEntries(BODIES.map(b => [b.id, b]));
export const PLANETS = BODIES.filter(b => b.parent === 'sun');
export const MOONS = BODIES.filter(b => b.parent !== null && b.parent !== 'sun');

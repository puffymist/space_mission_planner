// 2D vector math. All vectors are {x, y} objects.

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v, s) {
  return { x: v.x * s, y: v.y * s };
}

export function mag(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function mag2(v) {
  return v.x * v.x + v.y * v.y;
}

export function normalize(v) {
  const m = mag(v);
  if (m === 0) return { x: 0, y: 0 };
  return { x: v.x / m, y: v.y / m };
}

export function rotate(v, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

// 2D cross product (scalar): positive if b is counterclockwise from a
export function cross2d(a, b) {
  return a.x * b.y - a.y * b.x;
}

export function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

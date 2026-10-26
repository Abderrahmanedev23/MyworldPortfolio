import { Vector3 } from 'three'

// Island map. Positions are [x, z] on the ground plane; the island is ~64m across.
export const ISLAND_RADIUS = 32 // sand edge
export const GRASS_RADIUS = 26

export const SPAWN = [0, 2, 4]

export const ZONES = {
  plaza: [0, 0],
  house: [-15, -10],
  workshop: [15, -10],
  garden: [-15, 11],
  tower: [0, -22],
  field: [17, 4],
  cave: [-21, 19],
  dock: [30, 0],
}

// Milestone road (experience) — a winding path south-east of the plaza.
export const ROAD = [
  [2, 5],
  [4, 10],
  [8, 14.5],
  [13.5, 17],
  [19, 15.5],
]

// Footpaths from the plaza to each zone.
export const PATHS = [
  [ZONES.plaza, ZONES.house],
  [ZONES.plaza, ZONES.workshop],
  [ZONES.plaza, ZONES.garden],
  [ZONES.plaza, ZONES.tower],
  [ZONES.plaza, [27, 0]],
  ...ROAD.slice(1).map((p, i) => [ROAD[i], p]),
]

export const NPCS = [
  { id: 'npc-plaza', name: 'Mayor Pip', position: [3.5, -3], colors: { skin: '#c68b59', hair: '#d9d9d9', hoodie: '#8e6fd8', pants: '#3a3a3a', shoes: '#5a3e2b', glasses: false } },
  { id: 'npc-garden', name: 'Gardener Mo', position: [-10.5, 15.5], colors: { skin: '#f3d3b5', hair: '#a8452b', hoodie: '#5aa469', pants: '#6b4f2c', shoes: '#3b2a1a', glasses: false } },
  { id: 'npc-dock', name: 'Old Fisher', position: [26.5, -3.2], colors: { skin: '#8d5a3b', hair: '#ffffff', hoodie: '#f2c14e', pants: '#2f4858', shoes: '#222', glasses: true } },
]

/** Facing angle (rotation.y) for an object at [x, z] whose front (+z) looks at the plaza. */
export function faceCenter([x, z]) {
  return Math.atan2(-x, -z)
}

/** Convert a local [x, y, z] offset inside a zone to world coordinates. */
export function toWorld([lx, ly, lz], [ox, oz], rotY) {
  const c = Math.cos(rotY)
  const s = Math.sin(rotY)
  return [ox + lx * c + lz * s, ly, oz - lx * s + lz * c]
}

export const v3 = (a) => new Vector3(...a)

export function distToSegment([px, pz], [ax, az], [bx, bz]) {
  const dx = bx - ax
  const dz = bz - az
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz))
}

/** Points spaced evenly along a polyline. */
export function pointsAlong(line, count) {
  const segs = line.slice(1).map((p, i) => Math.hypot(p[0] - line[i][0], p[1] - line[i][1]))
  const total = segs.reduce((a, b) => a + b, 0)
  const out = []
  for (let k = 0; k < count; k++) {
    let d = count === 1 ? total / 2 : (total * (k + 0.5)) / count
    let i = 0
    while (i < segs.length - 1 && d > segs[i]) d -= segs[i++]
    const t = d / segs[i]
    const [ax, az] = line[i]
    const [bx, bz] = line[i + 1]
    out.push({ pos: [ax + (bx - ax) * t, az + (bz - az) * t], angle: Math.atan2(bx - ax, bz - az) })
  }
  return out
}

/** Tiny deterministic PRNG so the scenery is the same on every visit. */
export function rng(seed = 1) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

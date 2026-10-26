import { useLayoutEffect, useMemo, useRef } from 'react'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { cozyMaterial } from './shaders'
import { useStore } from '../store'
import {
  GRASS_RADIUS,
  ISLAND_RADIUS,
  PATHS,
  ROAD,
  ZONES,
  distToSegment,
  faceCenter,
  insideRect,
  rng,
} from './layout'

const KEEP_CLEAR = [
  [ZONES.plaza, 7],
  [ZONES.house, 8],
  [ZONES.workshop, 7],
  [[10.5, -6.5], 6], // project booths
  [ZONES.garden, 7],
  [ZONES.tower, 5],
  [ZONES.field, 6.5],
  [ZONES.cave, 4],
  [[24, -2], 4], // fisher NPC
]

function scatter(count, seed, minR, maxR, clearance, keepClear = KEEP_CLEAR) {
  const rand = rng(seed)
  const out = []
  let tries = 0
  while (out.length < count && tries++ < count * 40) {
    const a = rand() * Math.PI * 2
    const r = minR + Math.sqrt(rand()) * (maxR - minR)
    const p = [Math.cos(a) * r, Math.sin(a) * r]
    if (keepClear.some(([c, rad]) => Math.hypot(p[0] - c[0], p[1] - c[1]) < rad)) continue
    if (PATHS.some(([a1, b1]) => distToSegment(p, a1, b1) < clearance)) continue
    if (Math.abs(p[1]) < 3 && p[0] > 20) continue // dock path
    if (out.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < clearance * 1.4)) continue
    out.push(p)
  }
  return out
}

const dummy = new Object3D()
const tmpColor = new Color()

/** One InstancedMesh for a list of { p:[x,y,z], s:[sx,sy,sz]|number, r:[rx,ry,rz], c:color } */
function InstancedSet({ items, geometry, material, castShadow = true, receiveShadow = true }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const mesh = ref.current
    items.forEach((it, i) => {
      dummy.position.set(...it.p)
      const s = typeof it.s === 'number' ? [it.s, it.s, it.s] : it.s ?? [1, 1, 1]
      dummy.scale.set(...s)
      dummy.rotation.set(...(it.r ?? [0, 0, 0]))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      if (it.c) mesh.setColorAt(i, tmpColor.set(it.c))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}

const GREENS = ['#5fb35a', '#6cc265', '#55a957', '#79cf68']
const LIGHT_GREENS = ['#86d873', '#93df7a', '#7fd36d']
const BLOSSOM = ['#ffb7c8', '#ffa3bb', '#ffc9d6']
const AUTUMN = ['#f4a259', '#f7b267']

function buildTrees() {
  const rand = rng(3)
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]
  const ring = scatter(46, 7, 9, GRASS_RADIUS - 0.5, 2.2)
  // a little grove hiding the cave entrance
  const grove = [[-17.5, 16.5], [-19.5, 14.8], [-23.5, 15.8], [-16.5, 20], [-24.2, 21.8]]
  const trunks = []
  const canopy = []
  const cones = []
  const fruit = []
  const colliders = []
  for (const [x, z] of [...ring, ...grove]) {
    const s = 0.85 + rand() * 0.5
    const kind = rand()
    colliders.push({ x, z, s })
    if (kind < 0.27) {
      // pine
      trunks.push({ p: [x, 0.5 * s, z], s: [s * 0.8, s * 0.7, s * 0.8], c: '#7a4e32' })
      const g = pick(['#3f8f5a', '#468f55', '#3b8452'])
      ;[
        [1.1, 1.25, 1.5],
        [1.9, 0.95, 1.25],
        [2.6, 0.65, 1.0],
      ].forEach(([y, r, h]) => cones.push({ p: [x, y * s, z], s: [r * s, h * s, r * s], r: [0, rand() * 3, 0], c: g }))
    } else {
      // round, Animal Crossing-style tree
      trunks.push({ p: [x, 0.8 * s, z], s, r: [0, rand() * 3, (rand() - 0.5) * 0.12], c: '#8a5a3b' })
      const blossom = kind > 0.86
      const autumn = !blossom && kind > 0.8
      const base = blossom ? pick(BLOSSOM) : autumn ? pick(AUTUMN) : pick(GREENS)
      const top = blossom ? '#ffd3de' : autumn ? '#f9c784' : pick(LIGHT_GREENS)
      const a = rand() * Math.PI * 2
      canopy.push({ p: [x, 2.15 * s, z], s: [1.25 * s, 1.1 * s, 1.25 * s], c: base })
      canopy.push({ p: [x + Math.cos(a) * 0.8 * s, 1.85 * s, z + Math.sin(a) * 0.8 * s], s: 0.85 * s, c: base })
      canopy.push({ p: [x - Math.cos(a) * 0.75 * s, 1.95 * s, z - Math.sin(a) * 0.75 * s], s: 0.8 * s, c: base })
      canopy.push({ p: [x + Math.sin(a) * 0.2 * s, 2.85 * s, z - Math.cos(a) * 0.2 * s], s: 0.8 * s, c: top })
      if (!blossom && !autumn && kind > 0.6) {
        for (let k = 0; k < 5; k++) {
          const fa = rand() * Math.PI * 2
          const fy = 1.7 + rand() * 0.9
          fruit.push({ p: [x + Math.cos(fa) * 1.15 * s, fy * s, z + Math.sin(fa) * 1.15 * s], s: 0.13, c: kind > 0.75 ? '#ff6b6b' : '#ffb347' })
        }
      }
    }
  }
  return { trunks, canopy, cones, fruit, colliders }
}

function buildBushes() {
  const rand = rng(77)
  const spots = scatter(42, 31, 6.5, GRASS_RADIUS - 1, 1.3, KEEP_CLEAR.map(([c, r]) => [c, r - 1.5]))
  const balls = []
  const blooms = []
  for (const [x, z] of spots) {
    const g = GREENS[Math.floor(rand() * GREENS.length)]
    const s = 0.45 + rand() * 0.3
    ;[
      [0, 0, 1],
      [0.45, 0.15, 0.75],
      [-0.4, 0.25, 0.7],
    ].forEach(([ox, oz, k]) => balls.push({ p: [x + ox * s * 1.4, 0.32 * s * k + 0.05, z + oz * s * 1.4], s: [s * k, s * k * 0.85, s * k], c: g }))
    if (rand() > 0.5) {
      const c = ['#ffffff', '#ff8fab', '#ffd166', '#c792ea'][Math.floor(rand() * 4)]
      for (let k = 0; k < 4; k++) {
        const a = rand() * Math.PI * 2
        blooms.push({ p: [x + Math.cos(a) * s * 0.7, 0.45 * s + rand() * 0.2, z + Math.sin(a) * s * 0.7], s: 0.07, c })
      }
    }
  }
  return { balls, blooms }
}

const GRASS_COUNT = { low: 4000, medium: 12000, high: 22000 }

function bladeGeometry() {
  const g = new PlaneGeometry(0.13, 0.3, 1, 3)
  g.translate(0, 0.15, 0)
  const pos = g.attributes.position
  const uv = g.attributes.uv
  const colors = []
  const base = new Color('#4c8f40')
  const tip = new Color('#acd877')
  for (let i = 0; i < pos.count; i++) {
    const t = uv.getY(i)
    pos.setX(i, pos.getX(i) * (1 - t * 0.85))
    const c = base.clone().lerp(tip, t)
    colors.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return g
}

function Grass() {
  const quality = useStore((s) => s.settings.quality)
  const count = GRASS_COUNT[quality] ?? GRASS_COUNT.medium
  const geometry = useMemo(bladeGeometry, [])
  const material = useMemo(
    () => cozyMaterial({ vertexColors: true, side: DoubleSide, roughness: 1 }, { grass: true, flatUp: true }),
    [],
  )
  const items = useMemo(() => {
    const rand = rng(99)
    const out = []
    const houseRot = faceCenter(ZONES.house)
    const wsRot = faceCenter(ZONES.workshop)
    const gardenRot = faceCenter(ZONES.garden)
    const towerRot = faceCenter(ZONES.tower)
    let tries = 0
    while (out.length < count && tries++ < count * 12) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * (GRASS_RADIUS - 0.3)
      const p = [Math.cos(a) * r, Math.sin(a) * r]
      if (r < 5.9) continue // plaza
      // cluster blades into soft tufts / patches instead of an even carpet
      const patch = Math.sin(p[0] * 0.35) * Math.cos(p[1] * 0.3) + Math.sin(p[0] * 0.9 + p[1] * 0.7) * 0.5
      if (rand() > 0.35 + patch * 0.45) continue
      if (PATHS.some(([a1, b1], i) => distToSegment(p, a1, b1) < (i >= PATHS.length - (ROAD.length - 1) ? 1.25 : 1.0))) continue
      if (insideRect(p, ZONES.house, houseRot, 3.7, 3.3)) continue
      if (insideRect(p, ZONES.workshop, wsRot, 4.2, 3.2)) continue
      if (insideRect(p, ZONES.garden, gardenRot, 3.3, 3.3)) continue
      if (insideRect(p, ZONES.tower, towerRot, 1.4, 2.6)) continue
      const tint = 0.85 + rand() * 0.3
      out.push({
        p: [p[0], 0.02, p[1]],
        s: [0.8 + rand() * 0.5, 0.55 + rand() * 0.75, 1],
        r: [0, rand() * Math.PI, 0],
        c: rand() > 0.93 ? '#e8e27a' : `rgb(${Math.round(255 * tint * 0.95)}, ${Math.round(255 * Math.min(1, tint))}, ${Math.round(255 * tint * 0.9)})`,
      })
    }
    return out
  }, [count])
  return <InstancedSet key={count} items={items} geometry={geometry} material={material} castShadow={false} />
}

export function Island() {
  const trees = useMemo(buildTrees, [])
  const bushes = useMemo(buildBushes, [])
  const rocks = useMemo(() => {
    const rand = rng(11)
    return scatter(16, 13, 24, ISLAND_RADIUS - 1, 1.5).map((p) => {
      const s = 0.4 + rand() * 0.8
      return { p: [p[0], 0.15 * s, p[1]], s: [s, s * 0.7, s * 1.1], r: [rand(), rand() * 6, 0], c: rand() > 0.5 ? '#b8b2a7' : '#a9a49b', size: s, xz: p }
    })
  }, [])
  const flowers = useMemo(() => {
    const rand = rng(21)
    const colors = ['#ff6b9a', '#ffd166', '#ffffff', '#b388ff', '#ff8c42', '#7bdff2']
    return scatter(160, 17, 4, GRASS_RADIUS - 1, 0.6).map((p) => ({ p: [p[0], 0.2, p[1]], s: 0.8 + rand() * 0.5, c: colors[Math.floor(rand() * colors.length)] }))
  }, [])

  const m = useMemo(
    () => ({
      grass: cozyMaterial({ color: '#79b65e', roughness: 1 }, { tint: 0.14 }),
      sand: cozyMaterial({ color: '#ecd5a0', roughness: 1 }, { tint: 0.08 }),
      path: cozyMaterial({ color: '#e9d3a2', roughness: 1 }, { tint: 0.1 }),
      water: cozyMaterial({ color: '#ffffff', roughness: 0.15, metalness: 0.05 }, { water: true }),
      trunk: cozyMaterial({ roughness: 0.9 }, { occlusion: true }),
      leaves: cozyMaterial({ roughness: 0.8 }, { wind: 0.035, occlusion: true }),
      bush: cozyMaterial({ roughness: 0.85 }, { wind: 0.02 }),
      plain: cozyMaterial({ roughness: 0.6 }, {}),
      rock: cozyMaterial({ roughness: 0.95 }, { occlusion: true }),
    }),
    [],
  )
  const g = useMemo(
    () => ({
      trunk: new CylinderGeometry(0.17, 0.27, 1.6, 8),
      ball: new IcosahedronGeometry(1, 2),
      cone: new ConeGeometry(1, 1, 10),
      small: new IcosahedronGeometry(1, 1),
      rock: new DodecahedronGeometry(0.8, 1),
      flower: flowerGeometry(),
    }),
    [],
  )

  return (
    <group>
      {/* Ground: one big cylinder collider, sand ring + grass disc visuals */}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1, ISLAND_RADIUS]} position={[0, -1, 0]} />
      </RigidBody>
      <mesh position={[0, -1.25, 0]} receiveShadow material={m.sand}>
        <cylinderGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS + 3, 2.5, 96]} />
      </mesh>
      <mesh position={[0, -0.18, 0]} receiveShadow material={m.grass}>
        <cylinderGeometry args={[GRASS_RADIUS, GRASS_RADIUS + 0.7, 0.4, 96]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]} receiveShadow material={m.water}>
        <circleGeometry args={[240, 96]} />
      </mesh>

      {/* Plaza + paths (with rounded ends) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow material={m.path}>
        <circleGeometry args={[5.7, 48]} />
      </mesh>
      {PATHS.map(([a, b], i) => {
        const width = i >= PATHS.length - (ROAD.length - 1) ? 2.4 : 1.9
        const len = Math.hypot(b[0] - a[0], b[1] - a[1])
        const angle = Math.atan2(b[0] - a[0], b[1] - a[1])
        return (
          <group key={i}>
            <mesh
              position={[(a[0] + b[0]) / 2, 0.025, (a[1] + b[1]) / 2]}
              rotation={[-Math.PI / 2, 0, angle]}
              receiveShadow
              material={m.path}
            >
              <planeGeometry args={[width, len]} />
            </mesh>
            <mesh position={[b[0], 0.026, b[1]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={m.path}>
              <circleGeometry args={[width / 2, 20]} />
            </mesh>
          </group>
        )
      })}

      <Grass />

      {/* Trees */}
      <RigidBody type="fixed" colliders={false}>
        {trees.colliders.map(({ x, z, s }, i) => (
          <CylinderCollider key={i} args={[1.2 * s, 0.3 * s]} position={[x, 1.2 * s, z]} />
        ))}
      </RigidBody>
      <InstancedSet items={trees.trunks} material={m.trunk} geometry={g.trunk} />
      <InstancedSet items={trees.canopy} material={m.leaves} geometry={g.ball} />
      <InstancedSet items={trees.cones} material={m.leaves} geometry={g.cone} />
      <InstancedSet items={trees.fruit} material={m.plain} geometry={g.small} castShadow={false} />

      {/* Bushes */}
      <InstancedSet items={bushes.balls} material={m.bush} geometry={g.ball} />
      <InstancedSet items={bushes.blooms} material={m.plain} geometry={g.small} castShadow={false} />

      {/* Rocks on the beach */}
      <RigidBody type="fixed" colliders={false}>
        {rocks.map(({ xz, size }, i) => (
          <CuboidCollider key={i} args={[0.6 * size, 0.4 * size, 0.6 * size]} position={[xz[0], 0.2 * size, xz[1]]} />
        ))}
      </RigidBody>
      <InstancedSet items={rocks} material={m.rock} geometry={g.rock} />

      {/* Flowers */}
      <InstancedSet items={flowers} material={m.plain} geometry={g.flower} castShadow={false} />
    </group>
  )
}

// --- geometry helpers ---
function flowerGeometry() {
  // stem + five petals + centre, merged into one geometry
  const stem = new CylinderGeometry(0.012, 0.012, 0.2, 4)
  stem.translate(0, -0.1, 0)
  const parts = [stem]
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const petal = new SphereGeometry(0.045, 6, 4)
    petal.scale(1, 0.4, 1)
    petal.translate(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05)
    parts.push(petal)
  }
  const centre = new SphereGeometry(0.03, 6, 4)
  centre.translate(0, 0.015, 0)
  parts.push(centre)
  return mergeGeometries(parts.map((p) => p.toNonIndexed()))
}

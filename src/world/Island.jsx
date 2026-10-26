import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { occlude } from './occlusion'
import { GRASS_RADIUS, ISLAND_RADIUS, PATHS, ROAD, ZONES, distToSegment, rng } from './layout'

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

function scatter(count, seed, minR, maxR, clearance) {
  const rand = rng(seed)
  const out = []
  let tries = 0
  while (out.length < count && tries++ < count * 40) {
    const a = rand() * Math.PI * 2
    const r = minR + Math.sqrt(rand()) * (maxR - minR)
    const p = [Math.cos(a) * r, Math.sin(a) * r]
    if (KEEP_CLEAR.some(([c, rad]) => Math.hypot(p[0] - c[0], p[1] - c[1]) < rad)) continue
    if (PATHS.some(([a1, b1]) => distToSegment(p, a1, b1) < clearance)) continue
    if (Math.abs(p[1]) < 3 && p[0] > 20) continue // dock path
    if (out.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < clearance * 1.4)) continue
    out.push(p)
  }
  return out
}

function PathStrip({ from, to, width = 2 }) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const angle = Math.atan2(to[0] - from[0], to[1] - from[1])
  return (
    <group position={[(from[0] + to[0]) / 2, 0.025, (from[1] + to[1]) / 2]} rotation={[0, angle, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, len + width * 0.5]} />
        <meshStandardMaterial color="#e3cf9f" />
      </mesh>
    </group>
  )
}

function Water() {
  const foam = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    foam.current.position.y = -0.32 + Math.sin(t * 1.2) * 0.05
    foam.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.004)
  })
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
        <circleGeometry args={[220, 64]} />
        <meshStandardMaterial color="#3fb7d6" roughness={0.25} metalness={0.1} />
      </mesh>
      <mesh ref={foam} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ISLAND_RADIUS - 0.2, ISLAND_RADIUS + 0.9, 72]} />
        <meshStandardMaterial color="#e8fbff" transparent opacity={0.7} />
      </mesh>
    </>
  )
}

export function Island() {
  const trees = useMemo(() => {
    const ring = scatter(46, 7, 9, GRASS_RADIUS - 0.5, 2.2)
    // a little grove hiding the cave entrance
    const grove = [[-17.5, 16.5], [-19.5, 14.8], [-23.5, 15.8], [-16.5, 20], [-24.2, 21.8]]
    const rand = rng(3)
    return [...ring, ...grove].map((p) => ({ p, s: 0.8 + rand() * 0.6, hue: rand() }))
  }, [])
  const rocks = useMemo(() => {
    const rand = rng(11)
    return scatter(16, 13, 24, ISLAND_RADIUS - 1, 1.5).map((p) => ({ p, s: 0.4 + rand() * 0.8, r: rand() * 6 }))
  }, [])
  const flowers = useMemo(() => {
    const rand = rng(21)
    const colors = ['#ff6b9a', '#ffd166', '#ffffff', '#b388ff', '#ff8c42']
    return scatter(140, 17, 4, GRASS_RADIUS - 1, 0.6).map((p) => ({ p, c: colors[Math.floor(rand() * colors.length)] }))
  }, [])

  return (
    <group>
      {/* Ground: one big cylinder collider, sand ring + grass disc visuals */}
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1, ISLAND_RADIUS]} position={[0, -1, 0]} />
      </RigidBody>
      <mesh position={[0, -1.25, 0]} receiveShadow>
        <cylinderGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS + 3, 2.5, 48]} />
        <meshStandardMaterial color="#f1d9a0" flatShading />
      </mesh>
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <cylinderGeometry args={[GRASS_RADIUS, GRASS_RADIUS + 0.6, 0.4, 40]} />
        <meshStandardMaterial color="#7cc46a" flatShading />
      </mesh>
      <Water />

      {/* Plaza + paths */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <circleGeometry args={[5.5, 32]} />
        <meshStandardMaterial color="#d8c497" />
      </mesh>
      {PATHS.map(([a, b], i) => (
        <PathStrip key={i} from={a} to={b} width={i >= PATHS.length - (ROAD.length - 1) ? 2.4 : 1.8} />
      ))}

      {/* Trees */}
      <RigidBody type="fixed" colliders={false}>
        {trees.map(({ p, s }, i) => (
          <CylinderCollider key={i} args={[1.2 * s, 0.3 * s]} position={[p[0], 1.2 * s, p[1]]} />
        ))}
      </RigidBody>
      <Instances limit={trees.length} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.28, 1.4, 6]} />
        <meshStandardMaterial ref={occlude} color="#8a5a3b" flatShading />
        {trees.map(({ p, s }, i) => (
          <Instance key={i} position={[p[0], 0.7 * s, p[1]]} scale={s} />
        ))}
      </Instances>
      <Instances limit={trees.length * 2} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial ref={occlude} flatShading />
        {trees.map(({ p, s, hue }, i) => [
          <Instance
            key={`a${i}`}
            position={[p[0], 1.9 * s, p[1]]}
            scale={[1.1 * s, 1 * s, 1.1 * s]}
            color={hue > 0.7 ? '#4f9d4a' : hue > 0.35 ? '#5fb35a' : '#3f8f4f'}
          />,
          <Instance
            key={`b${i}`}
            position={[p[0], 2.75 * s, p[1]]}
            scale={0.7 * s}
            rotation={[0.3, hue * 3, 0]}
            color={hue > 0.5 ? '#6cc265' : '#57a957'}
          />,
        ])}
      </Instances>

      {/* Rocks on the beach */}
      <RigidBody type="fixed" colliders={false}>
        {rocks.map(({ p, s }, i) => (
          <CuboidCollider key={i} args={[0.6 * s, 0.5 * s, 0.6 * s]} position={[p[0], 0.3 * s, p[1]]} />
        ))}
      </RigidBody>
      <Instances limit={rocks.length} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#9aa0a6" flatShading />
        {rocks.map(({ p, s, r }, i) => (
          <Instance key={i} position={[p[0], 0.2 * s, p[1]]} scale={[s, s * 0.75, s]} rotation={[r, r * 2, 0]} />
        ))}
      </Instances>

      {/* Flowers */}
      <Instances limit={flowers.length}>
        <sphereGeometry args={[0.09, 6, 4]} />
        <meshStandardMaterial />
        {flowers.map(({ p, c }, i) => (
          <Instance key={i} position={[p[0], 0.12, p[1]]} color={c} />
        ))}
      </Instances>
    </group>
  )
}

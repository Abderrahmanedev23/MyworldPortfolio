import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, MeshStandardMaterial, Vector3 } from 'three'
import { playerState, useStore } from '../store'
import { audio } from '../audio'
import { spawnSplash } from './Particles'
import { ZONES, rng } from './layout'

const WATER_Y = -0.32

// ---------------- butterflies ----------------
const WING_COLORS = ['#ffb4d6', '#ffd166', '#a0e7ff', '#c9b6ff', '#ffffff', '#ff9f68']
const ANCHORS = [ZONES.garden, [0, 0], [-8, -16], [10, 12], [-20, 2], [6, -18]]

const Butterfly = forwardRef(function Butterfly({ color }, ref) {
  const root = useRef()
  const l = useRef()
  const r = useRef()
  useImperativeHandle(ref, () => ({ root, l, r }))
  const mat = useMemo(() => new MeshStandardMaterial({ color, side: DoubleSide, roughness: 0.6, emissive: color, emissiveIntensity: 0.15 }), [color])
  return (
    <group ref={root}>
      <mesh>
        <capsuleGeometry args={[0.012, 0.07, 2, 6]} />
        <meshStandardMaterial color="#3a2f3a" />
      </mesh>
      {[
        [l, -1],
        [r, 1],
      ].map(([ref2, s]) => (
        <group key={s} ref={ref2}>
          <mesh material={mat} position={[s * 0.06, 0, 0.015]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.055, 10]} />
          </mesh>
          <mesh material={mat} position={[s * 0.045, 0, -0.04]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.035, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  )
})

export function Butterflies({ count = 14 }) {
  const visible = useStore((s) => !s.night && s.weather !== 'rain')
  const refs = useRef([])
  const flies = useMemo(() => {
    const rand = rng(31)
    return Array.from({ length: count }, (_, i) => {
      const a = ANCHORS[i % ANCHORS.length]
      return {
        anchor: a,
        pos: new Vector3(a[0] + (rand() - 0.5) * 6, 0.8, a[1] + (rand() - 0.5) * 6),
        vel: new Vector3(),
        target: new Vector3(),
        retarget: 0,
        phase: rand() * 10,
        color: WING_COLORS[i % WING_COLORS.length],
      }
    })
  }, [count])
  useFrame(({ clock }, delta) => {
    if (!visible) return
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    flies.forEach((f, i) => {
      const r = refs.current[i]
      if (!r) return
      f.retarget -= dt
      if (f.retarget <= 0) {
        f.retarget = 1.5 + Math.random() * 2.5
        f.target.set(f.anchor[0] + (Math.random() - 0.5) * 9, 0.35 + Math.random() * 1.4, f.anchor[1] + (Math.random() - 0.5) * 9)
      }
      // flutter away from the player
      const p = playerState.position
      if (f.pos.distanceToSquared(p) < 2) f.target.set(f.pos.x + (f.pos.x - p.x) * 3, 1.8, f.pos.z + (f.pos.z - p.z) * 3)
      const desired = f.target.clone().sub(f.pos).clampLength(0, 1.4)
      f.vel.lerp(desired, 1 - Math.exp(-2 * dt))
      f.pos.addScaledVector(f.vel, dt)
      const root = r.root.current
      root.position.set(f.pos.x, f.pos.y + Math.sin(t * 6 + f.phase) * 0.06, f.pos.z)
      root.scale.setScalar(1.7)
      root.rotation.y = Math.atan2(f.vel.x, f.vel.z)
      const flap = 0.25 + Math.abs(Math.sin(t * 16 + f.phase)) * 1.1
      r.l.current.rotation.z = flap
      r.r.current.rotation.z = -flap
    })
  })
  if (!visible) return null
  return flies.map((f, i) => <Butterfly key={i} color={f.color} ref={(x) => (refs.current[i] = x)} />)
}

// ---------------- crabs ----------------
const CRAB = new MeshStandardMaterial({ color: '#e85d3f', roughness: 0.55 })
const CRAB_DARK = new MeshStandardMaterial({ color: '#1d1d24' })

const Crab = forwardRef(function Crab(_, ref) {
  const root = useRef()
  const legs = useRef()
  useImperativeHandle(ref, () => ({ root, legs }))
  return (
    <group ref={root}>
      <mesh material={CRAB} position={[0, 0.07, 0]} scale={[0.16, 0.07, 0.12]} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={CRAB} position={[s * 0.15, 0.08, 0.1]} scale={[0.05, 0.035, 0.06]}>
            <sphereGeometry args={[1, 8, 6]} />
          </mesh>
          <mesh material={CRAB_DARK} position={[s * 0.04, 0.15, 0.08]}>
            <sphereGeometry args={[0.018, 6, 6]} />
          </mesh>
          <mesh material={CRAB} position={[s * 0.04, 0.12, 0.08]}>
            <cylinderGeometry args={[0.006, 0.006, 0.05, 4]} />
          </mesh>
        </group>
      ))}
      <group ref={legs}>
        {[-1, 1].flatMap((s) =>
          [-0.05, 0, 0.05].map((z) => (
            <mesh key={`${s}${z}`} material={CRAB} position={[s * 0.17, 0.04, z]} rotation={[0, 0, s * 0.9]}>
              <cylinderGeometry args={[0.007, 0.007, 0.1, 4]} />
            </mesh>
          )),
        )}
      </group>
    </group>
  )
})

export function Crabs({ count = 6 }) {
  const refs = useRef([])
  const crabs = useMemo(() => {
    const rand = rng(57)
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + 0.4 + rand() * 0.5
      return { a, r: 28.5 + rand() * 2.5, dir: rand() > 0.5 ? 1 : -1, timer: rand() * 3, hidden: 0, depth: 0 }
    })
  }, [count])
  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    const p = playerState.position
    crabs.forEach((c, i) => {
      const ref = refs.current[i]
      if (!ref) return
      const x = Math.cos(c.a) * c.r
      const z = Math.sin(c.a) * c.r
      const near = (x - p.x) ** 2 + (z - p.z) ** 2 < 9
      if (near && c.hidden <= 0) c.hidden = 6 + Math.random() * 4 // dig in!
      let moving = false
      if (c.hidden > 0) {
        c.hidden -= dt
        c.depth = Math.min(1, c.depth + dt * 3)
      } else {
        c.depth = Math.max(0, c.depth - dt * 1.5)
        c.timer -= dt
        if (c.timer < 0) {
          c.timer = 1 + Math.random() * 3
          c.dir = Math.random() > 0.5 ? 1 : -1
        }
        if (c.timer > 0.6 && c.depth === 0) {
          c.a += (c.dir * 0.35 * dt) / c.r * 3 // scuttle sideways along the beach
          moving = true
        }
      }
      const root = ref.root.current
      root.position.set(x, -0.3 * c.depth, z)
      root.scale.setScalar(1.6)
      // face the sea, walk sideways like a proper crab
      root.rotation.y = Math.atan2(x, z)
      ref.legs.current.rotation.x = moving ? Math.sin(t * 30) * 0.15 : 0
      root.visible = c.depth < 0.98
    })
  })
  return Array.from({ length: count }, (_, i) => <Crab key={i} ref={(x) => (refs.current[i] = x)} />)
}

// ---------------- dolphins ----------------
const DOLPHIN = new MeshStandardMaterial({ color: '#6b8fae', roughness: 0.35 })
const BELLY = new MeshStandardMaterial({ color: '#dfe9f2', roughness: 0.4 })

const Dolphin = forwardRef(function Dolphin(_, ref) {
  const root = useRef()
  const tail = useRef()
  useImperativeHandle(ref, () => ({ root, tail }))
  return (
    <group ref={root}>
      <mesh material={DOLPHIN} scale={[0.32, 0.3, 1]} castShadow>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
      <mesh material={BELLY} position={[0, -0.08, 0.05]} scale={[0.26, 0.22, 0.85]}>
        <sphereGeometry args={[1, 14, 10]} />
      </mesh>
      <mesh material={DOLPHIN} position={[0, -0.02, 1.02]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.35, 10]} />
      </mesh>
      <mesh material={DOLPHIN} position={[0, 0.35, -0.1]} rotation={[-0.5, 0, 0]} scale={[0.4, 1, 1]}>
        <coneGeometry args={[0.18, 0.4, 4]} />
      </mesh>
      <group ref={tail} position={[0, 0, -0.95]}>
        <mesh material={DOLPHIN} position={[0, 0, -0.15]} scale={[0.6, 0.06, 0.25]}>
          <sphereGeometry args={[1, 10, 6]} />
        </mesh>
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} material={DOLPHIN} position={[s * 0.3, -0.12, 0.3]} rotation={[0.3, 0, s * 0.8]} scale={[0.25, 0.04, 0.14]}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
      ))}
    </group>
  )
})

export function Dolphins({ count = 3 }) {
  const refs = useRef([])
  const pod = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        a: i * 0.35,
        r: 48 + i * 2.5,
        next: 3 + i * 1.4,
        jump: -1,
      })),
    [count],
  )
  const center = useRef(Math.random() * Math.PI * 2)
  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    center.current += dt * 0.05
    pod.forEach((d, i) => {
      const ref = refs.current[i]
      if (!ref) return
      const a = center.current + d.a
      const x = Math.cos(a) * d.r
      const z = Math.sin(a) * d.r
      const heading = Math.atan2(-Math.sin(a), Math.cos(a)) // swimming along the circle
      const root = ref.root.current
      if (d.jump < 0 && t > d.next) {
        d.jump = 0
        spawnSplash(x, z, 10, 0.9)
        if (Math.hypot(x - playerState.position.x, z - playerState.position.z) < 35) audio.play('dolphin')
      }
      if (d.jump >= 0) {
        d.jump += dt / 1.5
        const k = d.jump
        root.visible = true
        root.position.set(x, WATER_Y - 0.4 + Math.sin(k * Math.PI) * 2.2, z)
        root.rotation.set(-Math.cos(k * Math.PI) * 0.9, heading, 0)
        ref.tail.current.rotation.x = Math.sin(t * 12) * 0.3
        if (k >= 1) {
          d.jump = -1
          d.next = t + 5 + Math.random() * 9
          spawnSplash(x, z, 12, 1)
        }
      } else {
        root.visible = false
      }
    })
  })
  return Array.from({ length: count }, (_, i) => <Dolphin key={i} ref={(x) => (refs.current[i] = x)} />)
}

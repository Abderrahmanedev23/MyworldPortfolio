import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshStandardMaterial, Vector3 } from 'three'
import { playerState, useStore } from '../store'
import { audio } from '../audio'
import { ZONES, faceCenter, toWorld } from './layout'

const MAT = {
  white: new MeshStandardMaterial({ color: '#fbfbf8', roughness: 0.8 }),
  grey: new MeshStandardMaterial({ color: '#aab3be', roughness: 0.8 }),
  dark: new MeshStandardMaterial({ color: '#2b2d3a', roughness: 0.8 }),
  beak: new MeshStandardMaterial({ color: '#f4b400', roughness: 0.5 }),
  leg: new MeshStandardMaterial({ color: '#f29e4c', roughness: 0.6 }),
}

/** One seagull with jointed wings. The parent animates it through the exposed parts. */
const Seagull = forwardRef(function Seagull(_, ref) {
  const root = useRef()
  const body = useRef()
  const head = useRef()
  const legs = useRef()
  const wings = useRef({})
  useImperativeHandle(ref, () => ({ root, body, head, legs, wings: wings.current }))
  const wing = (side) => (
    <group ref={(g) => (wings.current[side > 0 ? 'r' : 'l'] = g)} position={[side * 0.08, 0.05, 0.03]}>
      <mesh material={MAT.white} position={[side * 0.16, 0, 0]} castShadow>
        <boxGeometry args={[0.32, 0.02, 0.17]} />
      </mesh>
      <group ref={(g) => (wings.current[side > 0 ? 'ro' : 'lo'] = g)} position={[side * 0.31, 0, 0]}>
        <mesh material={MAT.grey} position={[side * 0.14, 0, -0.01]} castShadow>
          <boxGeometry args={[0.28, 0.016, 0.13]} />
        </mesh>
        <mesh material={MAT.dark} position={[side * 0.31, 0, -0.02]}>
          <boxGeometry args={[0.08, 0.016, 0.09]} />
        </mesh>
      </group>
    </group>
  )
  return (
    <group ref={root}>
      <group ref={body}>
        <mesh material={MAT.white} scale={[0.11, 0.1, 0.24]} castShadow>
          <sphereGeometry args={[1, 14, 10]} />
        </mesh>
        <mesh material={MAT.grey} position={[0, 0.06, -0.02]} scale={[0.1, 0.05, 0.2]}>
          <sphereGeometry args={[1, 12, 8]} />
        </mesh>
        <group ref={head} position={[0, 0.08, 0.19]}>
          <mesh material={MAT.white} castShadow>
            <sphereGeometry args={[0.075, 12, 10]} />
          </mesh>
          <mesh material={MAT.beak} position={[0, -0.01, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.022, 0.09, 6]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={MAT.dark} position={[s * 0.045, 0.02, 0.05]}>
              <sphereGeometry args={[0.012, 6, 6]} />
            </mesh>
          ))}
        </group>
        <mesh material={MAT.dark} position={[0, 0.02, -0.26]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.1, 0.015, 0.1]} />
        </mesh>
        {wing(1)}
        {wing(-1)}
        <group ref={legs}>
          {[-1, 1].map((s) => (
            <mesh key={s} material={MAT.leg} position={[s * 0.04, -0.13, 0.02]}>
              <cylinderGeometry args={[0.008, 0.008, 0.1, 4]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
})

const house = ZONES.house
const houseRot = faceCenter(house)

// Perches: dock posts, beach, the dock rail and the house chimney.
const PERCHES = [
  [33, 0.42, -0.9],
  [36, 0.42, 0.9],
  [37, 0.92, -0.4],
  [-30.4, 0.0, 7],
  [8.5, 0.0, -30.6],
  [-11.5, 0.0, 29.7],
  toWorld([1.8, 4.92, -0.8], house, houseRot),
]

const FLOCK = 5
const tmp = new Vector3()

export function Seagulls() {
  const night = useStore((s) => s.night)
  const refs = useRef([])
  const nextCry = useRef(4)
  const gulls = useMemo(() => {
    const out = []
    for (let i = 0; i < FLOCK; i++) {
      out.push({
        mode: 'orbit',
        pos: new Vector3(0, 12, 20),
        vel: new Vector3(4, 0, 0),
        orbit: { r: 14 + i * 4.5, y: 10 + (i % 3) * 2.5, w: (i % 2 ? 1 : -1) * (0.16 + i * 0.02), a: i * 1.3 },
        phase: Math.random() * 10,
        roll: 0,
      })
    }
    PERCHES.forEach((p, i) => {
      out.push({
        mode: 'perched',
        perch: new Vector3(...p),
        pos: new Vector3(...p),
        vel: new Vector3(),
        facing: (i * 2.1) % (Math.PI * 2),
        orbit: { r: 12 + i * 2, y: 9 + (i % 3) * 2, w: (i % 2 ? 1 : -1) * 0.2, a: 0 },
        phase: Math.random() * 10,
        roll: 0,
        timer: 0,
      })
    })
    return out
  }, [])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    const p = playerState.position
    gulls.forEach((g, i) => {
      const r = refs.current[i]
      if (!r) return
      const { root, body, head, legs, wings } = r
      if (night && g.mode === 'orbit' && !g.perch) {
        root.current.visible = false
        return
      }
      root.current.visible = true
      g.phase += dt

      if (g.mode === 'perched') {
        root.current.position.copy(g.pos)
        root.current.position.y += 0.13
        root.current.rotation.set(0, g.facing, 0)
        body.current.rotation.set(0, 0, 0)
        // idle: look around, the odd peck
        head.current.rotation.y = Math.sin(t * 0.7 + i) * 0.6
        head.current.rotation.x = Math.sin(t * 1.3 + i * 2) > 0.92 ? 0.7 : 0
        legs.current.visible = true
        wings.r.rotation.set(0, -1.45, -0.15)
        wings.l.rotation.set(0, 1.45, 0.15)
        wings.ro.rotation.set(0, 2.9, 0)
        wings.lo.rotation.set(0, -2.9, 0)
        const dx = g.pos.x - p.x
        const dz = g.pos.z - p.z
        if (dx * dx + dz * dz < 12 && Math.abs(g.pos.y - p.y) < 3) {
          // startled! take off away from the player
          g.mode = 'takeoff'
          g.timer = 0
          const len = Math.hypot(dx, dz) || 1
          g.vel.set((dx / len) * 3, 4, (dz / len) * 3)
          g.away = new Vector3(g.pos.x + (dx / len) * 10, g.pos.y + 7, g.pos.z + (dz / len) * 10)
          g.orbit.a = Math.atan2(g.pos.z, g.pos.x)
          audio.play('gull', { gain: 0.07 })
        }
        return
      }

      legs.current.visible = false
      g.timer = (g.timer ?? 0) + dt
      let speed = 5
      if (g.mode === 'takeoff') {
        tmp.copy(g.away)
        if (g.timer > 2.2) {
          g.mode = 'orbit'
          g.timer = 0
        }
      } else if (g.mode === 'orbit') {
        g.orbit.a += g.orbit.w * dt
        const a = g.orbit.a + Math.sign(g.orbit.w) * 0.35
        tmp.set(Math.cos(a) * g.orbit.r, g.orbit.y + Math.sin(t * 0.3 + i) * 1.5, Math.sin(a) * g.orbit.r)
        if (g.perch && g.timer > 16 + (i % 4) * 3) {
          g.mode = 'return'
          g.timer = 0
        }
      } else if (g.mode === 'return') {
        tmp.copy(g.perch)
        const d = g.pos.distanceTo(g.perch)
        speed = Math.max(1.2, Math.min(5, d * 0.9))
        if (d < 0.25) {
          g.mode = 'perched'
          g.pos.copy(g.perch)
          g.vel.set(0, 0, 0)
          g.facing = Math.atan2(-g.perch.x, -g.perch.z) + Math.PI // look out to sea
          return
        }
      }

      // steer towards the target
      const desired = tmp.sub(g.pos)
      const dist = desired.length()
      desired.multiplyScalar(speed / Math.max(dist, 0.001))
      const prevHeading = Math.atan2(g.vel.x, g.vel.z)
      g.vel.lerp(desired, 1 - Math.exp(-1.6 * dt))
      g.pos.addScaledVector(g.vel, dt)
      const heading = Math.atan2(g.vel.x, g.vel.z)
      const turn = Math.atan2(Math.sin(heading - prevHeading), Math.cos(heading - prevHeading)) / dt
      g.roll += (Math.max(-0.7, Math.min(0.7, -turn * 0.6)) - g.roll) * Math.min(1, dt * 3)

      root.current.position.copy(g.pos)
      root.current.rotation.set(0, heading, 0)
      body.current.rotation.set(-g.vel.y * 0.06, 0, g.roll)
      head.current.rotation.set(0, 0, 0)

      // flap in bursts, glide in between (always flap while climbing / landing)
      const flapping = g.mode !== 'orbit' || g.vel.y > 0.4 || g.phase % 7 < 2.2
      const w = flapping ? Math.sin(g.phase * 11) : Math.sin(g.phase * 1.5) * 0.08
      const inner = flapping ? w * 0.75 + 0.1 : 0.12 + w
      const outer = flapping ? Math.sin(g.phase * 11 - 0.9) * 0.6 : -0.08
      wings.r.rotation.set(0, 0, inner)
      wings.l.rotation.set(0, 0, -inner)
      wings.ro.rotation.set(0, 0, outer)
      wings.lo.rotation.set(0, 0, -outer)
    })

    // the occasional cry nearby
    if (!night && t > nextCry.current) {
      nextCry.current = t + 6 + Math.random() * 10
      const near = gulls.some((g) => g.pos.distanceTo(p) < 22)
      if (near) audio.play('gull', { gain: 0.035 })
    }
  })

  return gulls.map((_, i) => <Seagull key={i} ref={(r) => (refs.current[i] = r)} />)
}

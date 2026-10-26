import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D } from 'three'
import { playerState } from '../store'

const MAX = 40
const dummy = new Object3D()

/** Soft dust puffs kicked up when landing and while running. */
export function Dust() {
  const mesh = useRef()
  const puffs = useMemo(() => Array.from({ length: MAX }, () => ({ x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0, age: 9, life: 1, size: 1 })), [])
  const next = useRef(0)
  const lastLand = useRef(-1)
  const runTimer = useRef(0)

  const emit = (n, spread, up, size) => {
    const p = playerState.position
    for (let i = 0; i < n; i++) {
      const d = puffs[next.current]
      next.current = (next.current + 1) % MAX
      const a = Math.random() * Math.PI * 2
      d.x = p.x + Math.cos(a) * 0.2
      d.y = p.y - 0.62
      d.z = p.z + Math.sin(a) * 0.2
      d.vx = Math.cos(a) * spread * (0.6 + Math.random() * 0.6)
      d.vz = Math.sin(a) * spread * (0.6 + Math.random() * 0.6)
      d.vy = up * (0.5 + Math.random())
      d.age = 0
      d.life = 0.45 + Math.random() * 0.3
      d.size = size * (0.7 + Math.random() * 0.6)
    }
  }

  useFrame((_, delta) => {
    if (playerState.landedAt !== lastLand.current) {
      lastLand.current = playerState.landedAt
      if (playerState.landedAt > 0) emit(10, 2.2 * (0.5 + (playerState.landImpact ?? 0.5)), 0.6, 0.22)
    }
    if (playerState.anim === 'run' && playerState.grounded) {
      runTimer.current += delta
      if (runTimer.current > 0.12) {
        runTimer.current = 0
        emit(1, 0.4, 0.5, 0.15)
      }
    }
    puffs.forEach((d, i) => {
      d.age += delta
      const t = d.age / d.life
      if (t >= 1) {
        dummy.scale.setScalar(0)
      } else {
        d.x += d.vx * delta
        d.y += d.vy * delta
        d.z += d.vz * delta
        d.vx *= 0.92
        d.vz *= 0.92
        dummy.scale.setScalar(d.size * Math.sin(t * Math.PI) * (1 + t))
      }
      dummy.position.set(d.x, d.y, d.z)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  const color = playerState.surface === 'sand' ? '#f1dfb4' : '#efe6d6'
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color={color} roughness={1} transparent opacity={0.8} depthWrite={false} />
    </instancedMesh>
  )
}

// ---------------- water: ripples + splashes ----------------
const WATER_Y = -0.32
const ripples = Array.from({ length: 18 }, () => ({ x: 0, z: 0, age: 9, life: 1, size: 1 }))
let nextRipple = 0
const drops = Array.from({ length: 60 }, () => ({ x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0, alive: false }))
let nextDrop = 0

/** Spawn an expanding ring on the water surface. */
export function spawnRipple(x, z, size = 1, life = 1.2) {
  const r = ripples[nextRipple]
  nextRipple = (nextRipple + 1) % ripples.length
  Object.assign(r, { x, z, size, life, age: 0 })
}

/** Throw up a handful of droplets. */
export function spawnSplash(x, z, count = 14, power = 1) {
  for (let i = 0; i < count; i++) {
    const d = drops[nextDrop]
    nextDrop = (nextDrop + 1) % drops.length
    const a = Math.random() * Math.PI * 2
    const s = (0.6 + Math.random()) * power
    Object.assign(d, { x, y: WATER_Y + 0.05, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: (2 + Math.random() * 2.5) * power, alive: true })
  }
  spawnRipple(x, z, 1.4 * power, 1.4)
}

export function WaterFx() {
  const rings = useRef([])
  const dropMesh = useRef()
  const swimTimer = useRef(0)
  const lastSplash = useRef(0)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = playerState.position
    if (playerState.splashAt && playerState.splashAt !== lastSplash.current) {
      lastSplash.current = playerState.splashAt
      spawnSplash(p.x, p.z, 18, 1)
    }
    if (playerState.swimming) {
      swimTimer.current += dt
      const moving = playerState.anim === 'swim'
      if (swimTimer.current > (moving ? 0.28 : 0.9)) {
        swimTimer.current = 0
        spawnRipple(p.x, p.z, moving ? 0.8 : 0.6, moving ? 1 : 1.6)
        if (moving && Math.random() < 0.6) spawnSplash(p.x + Math.sin(playerState.facing) * 0.5, p.z + Math.cos(playerState.facing) * 0.5, 3, 0.45)
      }
    }
    ripples.forEach((r, i) => {
      const m = rings.current[i]
      if (!m) return
      r.age += dt
      const t = r.age / r.life
      if (t >= 1) {
        m.visible = false
        return
      }
      m.visible = true
      m.position.set(r.x, WATER_Y + 0.02, r.z)
      m.scale.setScalar(r.size * (0.3 + t * 1.4))
      m.material.opacity = (1 - t) * 0.7
    })
    drops.forEach((d, i) => {
      if (d.alive) {
        d.vy -= 14 * dt
        d.x += d.vx * dt
        d.y += d.vy * dt
        d.z += d.vz * dt
        if (d.y < WATER_Y) d.alive = false
      }
      dummy.position.set(d.x, d.y, d.z)
      dummy.scale.setScalar(d.alive ? 0.05 : 0)
      dummy.updateMatrix()
      dropMesh.current.setMatrixAt(i, dummy.matrix)
    })
    dropMesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      {ripples.map((_, i) => (
        <mesh key={i} ref={(m) => (rings.current[i] = m)} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color="#ffffff" transparent depthWrite={false} />
        </mesh>
      ))}
      <instancedMesh ref={dropMesh} args={[undefined, undefined, drops.length]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#e8fbff" roughness={0.2} />
      </instancedMesh>
    </>
  )
}

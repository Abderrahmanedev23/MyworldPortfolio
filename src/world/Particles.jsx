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

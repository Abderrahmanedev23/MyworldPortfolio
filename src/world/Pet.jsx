import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { playerState } from '../store'

const target = new Vector3()

// A little cat that trots after you and sits down when you stop.
export function Pet() {
  const group = useRef()
  const body = useRef()
  const tail = useRef()
  const pos = useRef(new Vector3(1.5, 0, 5))
  const hop = useRef(0)

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = playerState.position
    const behind = playerState.facing + Math.PI + 0.6
    target.set(p.x + Math.sin(behind) * 1.3, Math.max(0, p.y - 0.7), p.z + Math.cos(behind) * 1.3)
    const d = target.distanceTo(pos.current)
    if (d > 20) pos.current.copy(target) // teleport after respawns
    const moving = d > 0.4
    if (moving) {
      const speed = Math.min(d * 2.5, 9)
      const dir = target.clone().sub(pos.current).normalize()
      pos.current.addScaledVector(dir, speed * dt)
      const yaw = Math.atan2(dir.x, dir.z)
      const r = group.current.rotation
      r.y += Math.atan2(Math.sin(yaw - r.y), Math.cos(yaw - r.y)) * 0.2
      hop.current += dt * speed * 2.2
    } else {
      const look = Math.atan2(p.x - pos.current.x, p.z - pos.current.z)
      const r = group.current.rotation
      r.y += Math.atan2(Math.sin(look - r.y), Math.cos(look - r.y)) * 0.05
    }
    group.current.position.copy(pos.current)
    body.current.position.y = moving ? Math.abs(Math.sin(hop.current)) * 0.12 : 0
    body.current.rotation.x = moving ? 0 : -0.35
    tail.current.rotation.z = Math.sin(clock.elapsedTime * (moving ? 10 : 2)) * 0.4
  })

  const fur = '#f4a261'
  return (
    <group ref={group}>
      <group ref={body}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <capsuleGeometry args={[0.14, 0.3, 4, 8]} />
          <meshStandardMaterial color={fur} />
        </mesh>
        <group position={[0, 0.42, 0.22]}>
          <mesh castShadow>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshStandardMaterial color={fur} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.08, 0.15, 0]}>
              <coneGeometry args={[0.05, 0.1, 4]} />
              <meshStandardMaterial color={fur} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={`e${s}`} position={[s * 0.06, 0.02, 0.14]}>
              <sphereGeometry args={[0.025, 6, 6]} />
              <meshStandardMaterial color="#222" />
            </mesh>
          ))}
        </group>
        <group ref={tail} position={[0, 0.3, -0.2]}>
          <mesh position={[0, 0.15, -0.05]} rotation={[-0.4, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 0.35, 6]} />
            <meshStandardMaterial color="#e76f51" />
          </mesh>
        </group>
        {[
          [-0.08, 0.12],
          [0.08, 0.12],
          [-0.08, -0.12],
          [0.08, -0.12],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.06, z]}>
            <cylinderGeometry args={[0.035, 0.035, 0.12, 6]} />
            <meshStandardMaterial color={fur} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

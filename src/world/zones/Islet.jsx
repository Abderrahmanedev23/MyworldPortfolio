import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { useInteractable } from '../../interaction'
import { useStore } from '../../store'
import { secrets } from '../../content'
import { audio } from '../../audio'
import { ISLET } from '../layout'

function Palm({ position, lean = 0.25, rot = 0 }) {
  const crown = useRef()
  useFrame(({ clock }) => {
    crown.current.rotation.z = Math.sin(clock.elapsedTime * 1.2 + rot) * 0.05
  })
  const segs = 7
  return (
    <group position={position} rotation={[0, rot, 0]}>
      {Array.from({ length: segs }, (_, i) => {
        const y = 0.35 + i * 0.5
        const x = Math.pow(i / segs, 1.6) * lean * 3
        return (
          <mesh key={i} position={[x, y, 0]} rotation={[0, 0, -lean * 0.6 * (i / segs)]} castShadow>
            <cylinderGeometry args={[0.13 - i * 0.008, 0.16 - i * 0.008, 0.52, 8]} />
            <meshStandardMaterial color={i % 2 ? '#a07850' : '#8b6a45'} />
          </mesh>
        )
      })}
      <group ref={crown} position={[lean * 3, 0.35 + segs * 0.5, 0]}>
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} rotation={[0, (i / 7) * Math.PI * 2, 0]}>
            <mesh position={[0.9, -0.25, 0]} rotation={[0, 0, -0.5]} scale={[1, 0.08, 0.32]} castShadow>
              <sphereGeometry args={[0.9, 10, 6]} />
              <meshStandardMaterial color={i % 2 ? '#4fa45a' : '#5fb35a'} />
            </mesh>
          </group>
        ))}
        {[0, 2, 4].map((i) => (
          <mesh key={i} position={[Math.cos(i) * 0.18, -0.15, Math.sin(i) * 0.18]}>
            <sphereGeometry args={[0.12, 8, 6]} />
            <meshStandardMaterial color="#7a5a35" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Chest({ position, world }) {
  const found = useStore((s) => s.achievements.includes('treasure'))
  const unlock = useStore((s) => s.unlock)
  const openPanel = useStore((s) => s.openPanel)
  const [open, setOpen] = useState(found)
  const lid = useRef()
  useInteractable('treasure-chest', {
    position: world,
    radius: 2,
    label: open ? 'Look inside the chest' : 'Open the chest',
    promptHeight: 1.4,
    onInteract: () => {
      if (!open) audio.play('chest')
      setOpen(true)
      unlock('treasure')
      openPanel({ kind: 'secret', data: secrets.find((x) => x.id === 'treasure'), focus: [world[0], 0.6, world[2]], focusDistance: 3 })
    },
  })
  useFrame((_, dt) => {
    lid.current.rotation.x += ((open ? -1.9 : 0) - lid.current.rotation.x) * Math.min(1, dt * 5)
  })
  return (
    <group position={position} rotation={[0, 0.6, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.45, 0.3, 0.3]} position={[0, 0.3, 0]} />
      </RigidBody>
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.9, 0.5, 0.6]} />
        <meshStandardMaterial color="#8a5a2b" />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.25, 0]}>
          <boxGeometry args={[0.08, 0.52, 0.62]} />
          <meshStandardMaterial color="#d4a72c" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      <group ref={lid} position={[0, 0.5, -0.3]}>
        <mesh position={[0, 0.1, 0.3]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.9, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#9a6431" side={2} />
        </mesh>
      </group>
      {open && (
        <mesh position={[0, 0.45, 0]}>
          <sphereGeometry args={[0.22, 12, 8]} />
          <meshStandardMaterial color="#ffd166" emissive="#ffb703" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      )}
      <Sparkles count={found ? 8 : 26} scale={[1.6, 1.2, 1.6]} position={[0, 0.7, 0]} size={4} speed={0.4} color="#ffe28a" />
    </group>
  )
}

/** The secret islet: a sandbar with palms, rocks and a treasure chest. */
export function Islet() {
  const [x, z] = ISLET.pos
  const r = ISLET.r
  const foam = useRef()
  useFrame(({ clock }) => {
    foam.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.3) * 0.02)
  })
  const rocks = useMemo(
    () => [
      [r - 1.2, 0.8, 0.5],
      [-r + 1.5, -1.6, 0.7],
      [1.2, -r + 1.3, 0.45],
    ],
    [r],
  )
  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1, r]} position={[0, -1, 0]} />
        {rocks.map(([rx, rz, s], i) => (
          <CuboidCollider key={i} args={[0.6 * s, 0.4 * s, 0.6 * s]} position={[rx, 0.2 * s, rz]} />
        ))}
        <CylinderCollider args={[1.5, 0.25]} position={[-1, 1.5, 1]} />
      </RigidBody>
      <mesh position={[0, -1.25, 0]} receiveShadow>
        <cylinderGeometry args={[r, r + 3, 2.5, 48]} />
        <meshStandardMaterial color="#efd6a0" />
      </mesh>
      <mesh ref={foam} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <ringGeometry args={[r - 0.1, r + 1.2, 48]} />
        <meshBasicMaterial color="#effcff" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      {rocks.map(([rx, rz, s], i) => (
        <mesh key={i} position={[rx, 0.15 * s, rz]} scale={[s, s * 0.7, s]} rotation={[i, i * 2, 0]} castShadow>
          <dodecahedronGeometry args={[0.8, 1]} />
          <meshStandardMaterial color="#b0aaa0" />
        </mesh>
      ))}
      <Palm position={[-1, 0, 1]} lean={0.3} rot={0.4} />
      <Palm position={[2.2, 0, 2.4]} lean={0.2} rot={2.6} />
      {/* a little pirate flag */}
      <group position={[2.8, 0, -2.2]}>
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 2, 6]} />
          <meshStandardMaterial color="#5a4632" />
        </mesh>
        <mesh position={[0.3, 1.75, 0]}>
          <planeGeometry args={[0.6, 0.4]} />
          <meshStandardMaterial color="#222" side={2} />
        </mesh>
      </group>
      <Chest position={[0.6, 0, -1.2]} world={[x + 0.6, 0, z - 1.2]} />
    </group>
  )
}

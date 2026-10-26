import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { Label } from '../Label'
import { useInteractable } from '../../interaction'
import { useStore } from '../../store'
import { ZONES, faceCenter, toWorld } from '../layout'

const origin = ZONES.tower
const rot = faceCenter(origin)
const at = (local) => toWorld(local, origin, rot)
const TOWER_H = 9

export function ContactTower() {
  const openPanel = useStore((s) => s.openPanel)
  const beacon = useRef()
  const flag = useRef()
  useInteractable('mailbox', {
    position: at([1.8, 0, 2.2]),
    radius: 2,
    label: 'Contact me',
    promptHeight: 2,
    onInteract: () => openPanel({ kind: 'contact', focus: at([1.8, 1, 1.4]), focusDistance: 3.2 }),
  })
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    beacon.current.emissiveIntensity = Math.sin(t * 3) > 0 ? 3 : 0.2
    flag.current.rotation.z = -0.2 + Math.sin(t * 2) * 0.15
  })
  const legs = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]
  return (
    <group position={[origin[0], 0, origin[1]]} rotation={[0, rot, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.2, 2, 1.2]} position={[0, 2, -1]} />
        <CylinderCollider args={[0.6, 0.15]} position={[1.8, 0.6, 1.4]} />
      </RigidBody>
      {/* lattice tower */}
      <group position={[0, 0, -1]}>
        {legs.map(([x, z], i) => (
          <mesh key={i} position={[x * 0.55, TOWER_H / 2, z * 0.55]} rotation={[z * 0.1, 0, -x * 0.1]} castShadow>
            <cylinderGeometry args={[0.07, 0.1, TOWER_H, 6]} />
            <meshStandardMaterial color="#d62828" />
          </mesh>
        ))}
        {[1.5, 3, 4.5, 6, 7.5].map((y, i) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[1.9 - y * 0.18, 0.08, 1.9 - y * 0.18]} />
            <meshStandardMaterial color={i % 2 ? '#d62828' : '#f8f9fa'} />
          </mesh>
        ))}
        <mesh position={[0, TOWER_H + 0.3, 0]}>
          <sphereGeometry args={[0.25, 12, 10]} />
          <meshStandardMaterial ref={beacon} color="#ff3b3b" emissive="#ff0000" />
        </mesh>
        <mesh position={[0, 6.5, 0.45]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.6, 0.15, 0.25, 16, 1, true]} />
          <meshStandardMaterial color="#e9ecef" side={2} />
        </mesh>
        <Label text="Contact" size={0.5} billboard position={[0, TOWER_H + 1.1, 0]} />
      </group>
      {/* mailbox */}
      <group position={[1.8, 0, 1.4]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial color="#6d4c41" />
        </mesh>
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[0.5, 0.4, 0.75]} />
          <meshStandardMaterial color="#4f7cff" />
        </mesh>
        <mesh position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.75, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#4f7cff" />
        </mesh>
        <group ref={flag} position={[0.28, 1.2, -0.2]}>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.03, 0.4, 0.03]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0, 0.35, 0.1]}>
            <boxGeometry args={[0.03, 0.15, 0.2]} />
            <meshStandardMaterial color="#e63946" />
          </mesh>
        </group>
        <Label text="✉ Mail me" size={0.22} position={[0, 1.85, 0]} billboard />
      </group>
    </group>
  )
}

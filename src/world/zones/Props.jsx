import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { useInteractable } from '../../interaction'
import { playerState, useStore } from '../../store'
import { toWorld } from '../layout'

/** A bench you can sit on. `position` is [x, z], `rotation` is the facing angle. */
export function Bench({ id, position, rotation = 0 }) {
  const [x, z] = position
  const seat = toWorld([0, 0.45, 0.05], [x, z], rotation)
  useInteractable(id, {
    position: toWorld([0, 0.45, 0.8], [x, z], rotation),
    radius: 1.6,
    label: 'Sit',
    promptHeight: 1.2,
    onInteract: () => {
      playerState.sitAt = { position: seat, rotation }
    },
  })
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.9, 0.22, 0.3]} position={[0, 0.22, 0]} />
      </RigidBody>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.08, 0.55]} />
        <meshStandardMaterial color="#b5793f" />
      </mesh>
      <mesh position={[0, 0.75, -0.25]} rotation={[-0.15, 0, 0]} castShadow>
        <boxGeometry args={[1.8, 0.4, 0.06]} />
        <meshStandardMaterial color="#b5793f" />
      </mesh>
      {[-0.75, 0.75].map((lx) => (
        <mesh key={lx} position={[lx, 0.2, 0]} castShadow>
          <boxGeometry args={[0.08, 0.4, 0.5]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>
      ))}
    </group>
  )
}

/** Street lamp that lights up at night. */
export function Lamp({ position, light = false }) {
  const night = useStore((s) => s.night)
  const [x, z] = position
  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1.3, 0.12]} position={[0, 1.3, 0]} />
      </RigidBody>
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 2.6, 8]} />
        <meshStandardMaterial color="#33384a" />
      </mesh>
      <mesh position={[0, 2.75, 0]}>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshStandardMaterial
          color="#fff3c4"
          emissive="#ffcf6b"
          emissiveIntensity={night ? 3 : 0.1}
          toneMapped={!night}
        />
      </mesh>
      {light && night && <pointLight position={[0, 2.6, 0]} color="#ffcf6b" intensity={12} distance={10} decay={1.6} />}
    </group>
  )
}

/** Simple wooden signpost with a board facing +z. */
export function Signpost({ children, height = 1.6, width = 1.8, boardHeight = 0.8, color = '#c58b52' }) {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.12, height / 2, 0.12]} position={[0, height / 2, 0]} />
      </RigidBody>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[0.14, height, 0.14]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
      <mesh position={[0, height, 0.05]} castShadow>
        <boxGeometry args={[width, boardHeight, 0.08]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <group position={[0, height, 0.1]}>{children}</group>
    </group>
  )
}

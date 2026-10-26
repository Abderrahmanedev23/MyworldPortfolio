import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { Label } from '../Label'
import { Bench, Lamp, Signpost } from './Props'
import { useInteractable } from '../../interaction'
import { useStore } from '../../store'
import { profile } from '../../content'
import { isTouch } from '../../store'

function Fountain() {
  const water = useRef()
  useFrame(({ clock }) => {
    water.current.scale.y = 1 + Math.sin(clock.elapsedTime * 3) * 0.08
  })
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.35, 1.6]} position={[0, 0.35, 0]} />
      </RigidBody>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.6, 1.75, 0.6, 20]} />
        <meshStandardMaterial color="#c9c3b6" flatShading />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.1, 20]} />
        <meshStandardMaterial color="#5ccfe6" />
      </mesh>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.25, 1, 8]} />
        <meshStandardMaterial color="#c9c3b6" />
      </mesh>
      <mesh ref={water} position={[0, 1.6, 0]}>
        <coneGeometry args={[0.45, 0.8, 10, 1, true]} />
        <meshStandardMaterial color="#9be7f5" transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

export function Plaza() {
  const openPanel = useStore((s) => s.openPanel)
  useInteractable('welcome-sign', {
    position: [0, 0, 3.3],
    radius: 2.2,
    label: 'Read sign',
    promptHeight: 2.4,
    onInteract: () => openPanel({ kind: 'sign', focus: [0, 1.6, 2.6] }),
  })
  const hint = isTouch ? 'Joystick to walk · tap ✋ to interact' : 'WASD to walk · Shift to run · E to interact'
  return (
    <group>
      <Fountain />
      <group position={[0, 0, 2.6]}>
        <Signpost width={3.4} boardHeight={1.3} height={1.7}>
          <Label text={`${profile.name}'s World`} size={0.42} background={null} position={[0, 0.2, 0]} />
          <Label text={hint} size={0.16} background={null} font="500" position={[0, -0.25, 0]} />
        </Signpost>
      </group>
      <Bench id="bench-plaza" position={[-4.2, 3.2]} rotation={Math.atan2(4.2, -3.2)} />
      <Lamp position={[3.8, 3.8]} light />
      <Lamp position={[-3.8, -3.8]} />
    </group>
  )
}

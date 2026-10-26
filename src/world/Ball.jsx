import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BallCollider, CuboidCollider, RigidBody } from '@react-three/rapier'
import { Label } from './Label'
import { useStore } from '../store'
import { ZONES } from './layout'

const [fx, fz] = ZONES.field
const BALL_START = [fx - 3, 1, fz]
const GOAL = [fx + 3.5, fz] // goal mouth faces -x

export function Ball() {
  const ball = useRef()
  const scored = useRef(false)
  const unlock = useStore((s) => s.unlock)
  const showToast = useStore((s) => s.showToast)

  const reset = () => {
    ball.current?.setTranslation({ x: BALL_START[0], y: BALL_START[1], z: BALL_START[2] }, true)
    ball.current?.setLinvel({ x: 0, y: 0, z: 0 }, true)
    ball.current?.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }

  useFrame(() => {
    const p = ball.current?.translation()
    if (p && p.y < -3) reset()
  })

  return (
    <group>
      <RigidBody ref={ball} name="ball" colliders={false} position={BALL_START} restitution={0.6} linearDamping={0.6} angularDamping={0.6} ccd>
        <BallCollider args={[0.3]} mass={0.15} friction={0.8} />
        <mesh castShadow>
          <icosahedronGeometry args={[0.3, 1]} />
          <meshStandardMaterial color="#ffffff" flatShading />
        </mesh>
        <mesh scale={1.01}>
          <icosahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial color="#222" wireframe />
        </mesh>
      </RigidBody>

      {/* goal */}
      <group position={[GOAL[0], 0, GOAL[1]]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[0.08, 0.7, 0.08]} position={[0, 0.7, -1.3]} />
          <CuboidCollider args={[0.08, 0.7, 0.08]} position={[0, 0.7, 1.3]} />
          <CuboidCollider args={[0.08, 0.08, 1.4]} position={[0, 1.42, 0]} />
          <CuboidCollider args={[0.05, 0.7, 1.3]} position={[0.9, 0.7, 0]} />
          <CuboidCollider
            sensor
            args={[0.35, 0.6, 1.2]}
            position={[0.5, 0.6, 0]}
            onIntersectionEnter={({ other }) => {
              if (other.rigidBodyObject?.name !== 'ball' || scored.current) return
              scored.current = true
              if (!unlock('goal')) showToast({ title: 'GOAL!', text: 'The crowd (one cat) goes wild.', icon: '⚽' })
              setTimeout(() => {
                reset()
                scored.current = false
              }, 1800)
            }}
          />
        </RigidBody>
        {[-1.3, 1.3].map((z) => (
          <mesh key={z} position={[0, 0.7, z]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 1.4, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))}
        <mesh position={[0, 1.42, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 2.74, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.9, 0.7, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[2.6, 1.4, 8, 5]} />
          <meshStandardMaterial color="#ffffff" wireframe />
        </mesh>
        <Label text="⚽ kick it in!" size={0.25} billboard position={[0, 2, 0]} />
      </group>
      {/* pitch markings */}
      <mesh position={[fx, 0.03, fz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.2, 32]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

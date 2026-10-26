import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Bench } from './Props'
import { useInteractable } from '../../interaction'
import { useStore } from '../../store'
import { secrets } from '../../content'
import { ZONES, rng } from '../layout'
import { occlude } from '../occlusion'

const CATCHES = [
  'an old boot 🥾',
  'a tiny fish 🐟',
  'a rubber duck 🦆',
  'a message in a bottle: "hire this dev" 🍾',
  'a semicolon ;',
  'a shiny pufferfish 🐡',
  'absolutely nothing. The fish are on a break.',
]

function Dock() {
  const [x0] = ZONES.dock
  const length = 9
  const unlock = useStore((s) => s.unlock)
  const showToast = useStore((s) => s.showToast)
  const bobber = useRef()
  const count = useRef(0)
  useInteractable('fishing', {
    position: [x0 + length - 2.6, 0.1, 0],
    radius: 1.8,
    label: 'Go fishing',
    promptHeight: 1.8,
    onInteract: () => {
      const first = unlock('fishing')
      if (!first) {
        const c = CATCHES[count.current++ % CATCHES.length]
        showToast({ title: 'You caught…', text: c, icon: '🎣' })
      }
    },
  })
  useFrame(({ clock }) => {
    bobber.current.position.y = -0.3 + Math.sin(clock.elapsedTime * 2.5) * 0.05
  })
  const planks = Array.from({ length: Math.floor(length / 0.5) }, (_, i) => i)
  return (
    <group position={[x0, 0, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[length / 2, 0.1, 1]} position={[length / 2 - 2, 0.02, 0]} />
        {/* rails keep you from walking off the end (jumping still works) */}
        <CuboidCollider args={[0.05, 0.5, 1]} position={[length - 2, 0.5, 0]} />
      </RigidBody>
      {planks.map((i) => (
        <mesh key={i} position={[i * 0.5 - 1.75, 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.46, 0.08, 2]} />
          <meshStandardMaterial color={i % 2 ? '#b5793f' : '#a86f39'} />
        </mesh>
      ))}
      {[0, 3, 6].map((x) =>
        [-0.9, 0.9].map((z) => (
          <mesh key={`${x}${z}`} position={[x, -0.3, z]}>
            <cylinderGeometry args={[0.1, 0.1, 1.4, 6]} />
            <meshStandardMaterial color="#6d4c41" />
          </mesh>
        )),
      )}
      <mesh position={[length - 2, 0.5, 0]}>
        <boxGeometry args={[0.08, 0.8, 2]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>
      {/* fishing rod resting at the end + bobber in the water */}
      <mesh position={[length - 2.4, 0.6, 0.6]} rotation={[0, 0, -0.9]}>
        <cylinderGeometry args={[0.02, 0.03, 2]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh ref={bobber} position={[length + 0.2, -0.3, 0.6]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#e63946" />
      </mesh>
      <Bench id="bench-dock" position={[length - 3.6, -0.9]} rotation={0} />
    </group>
  )
}

function Cave() {
  const [cx, cz] = ZONES.cave
  const crystal = useRef()
  const found = useStore((s) => s.achievements.includes('cave'))
  const unlock = useStore((s) => s.unlock)
  const openPanel = useStore((s) => s.openPanel)
  useInteractable('cave-crystal', {
    position: [cx, 0, cz],
    radius: 1.8,
    label: found ? 'Touch the crystal' : 'What is this?',
    promptHeight: 2,
    onInteract: () => {
      unlock('cave')
      openPanel({ kind: 'secret', data: secrets.find((s) => s.id === 'cave'), focus: [cx, 1, cz], focusDistance: 3 })
    },
  })
  useFrame(({ clock }) => {
    crystal.current.rotation.y = clock.elapsedTime * 0.6
    crystal.current.material.emissiveIntensity = 1.2 + Math.sin(clock.elapsedTime * 2) * 0.4
  })
  // ring of boulders open towards the north-east
  const rocks = useMemo(() => {
    const rand = rng(5)
    const out = []
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 7) {
      const opening = Math.atan2(-1, 1) // facing (+x, -z)
      const d = Math.atan2(Math.sin(a - opening), Math.cos(a - opening))
      if (Math.abs(d) < 0.5) continue
      out.push({ p: [cx + Math.cos(a) * 2.6, cz + Math.sin(a) * 2.6], s: 1 + rand() * 0.5, r: rand() * 6 })
    }
    return out
  }, [cx, cz])
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {rocks.map(({ p, s }, i) => (
          <CuboidCollider key={i} args={[0.7 * s, 1.2 * s, 0.7 * s]} position={[p[0], 1 * s, p[1]]} />
        ))}
      </RigidBody>
      {rocks.map(({ p, s, r }, i) => (
        <mesh key={i} position={[p[0], 0.9 * s, p[1]]} scale={[s, s * 1.5, s]} rotation={[r, r * 2, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.9, 0]} />
          <meshStandardMaterial ref={occlude} color="#7d8597" flatShading />
        </mesh>
      ))}
      {/* roof slab */}
      <mesh position={[cx, 2.9, cz]} rotation={[0.1, 0.4, 0.05]} scale={[1, 0.35, 1]} castShadow>
        <dodecahedronGeometry args={[2.6, 0]} />
        <meshStandardMaterial ref={occlude} color="#6c757d" flatShading />
      </mesh>
      <mesh ref={crystal} position={[cx, 0.9, cz]}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color="#b388ff" emissive="#7b2ff7" emissiveIntensity={1.2} />
      </mesh>
      <pointLight position={[cx, 1.2, cz]} color="#b388ff" intensity={6} distance={5} />
    </group>
  )
}

export function Secrets() {
  return (
    <>
      <Dock />
      <Cave />
    </>
  )
}

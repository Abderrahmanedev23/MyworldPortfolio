import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Label } from '../Label'
import { useInteractable } from '../../interaction'
import { useStore } from '../../store'
import { projects, secrets } from '../../content'
import { occlude } from '../occlusion'
import { ZONES, faceCenter, toWorld } from '../layout'

const origin = ZONES.workshop
const rot = faceCenter(origin)
const at = (local) => toWorld(local, origin, rot)
const W = 8
const D = 6
const H = 3

function Booth({ project, index, local }) {
  const openPanel = useStore((s) => s.openPanel)
  const screen = useRef()
  useInteractable(`project-${project.id}`, {
    position: at([local[0], 0, local[2] + 0.9]),
    radius: 1.5,
    label: `View ${project.title}`,
    promptHeight: 2.6,
    onInteract: () => openPanel({ kind: 'project', data: index, focus: at([local[0], 1.5, local[2]]), focusDistance: 3.6 }),
  })
  useFrame(({ clock }) => {
    screen.current.emissiveIntensity = 0.35 + Math.sin(clock.elapsedTime * 2 + index) * 0.1
  })
  return (
    <group position={local}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.7, 0.5, 0.35]} position={[0, 0.5, 0]} />
      </RigidBody>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 1, 0.7]} />
        <meshStandardMaterial color="#f4f1ea" />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[1.5, 0.05, 0.8]} />
        <meshStandardMaterial color={project.color} />
      </mesh>
      {/* framed screen */}
      <group position={[0, 1.65, 0]} rotation={[-0.08, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 1, 0.08]} />
          <meshStandardMaterial color="#2b2d42" />
        </mesh>
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[1.36, 0.86]} />
          <meshStandardMaterial ref={screen} color={project.color} emissive={project.color} emissiveIntensity={0.35} />
        </mesh>
        <Label text={project.title} size={0.17} background="rgba(0,0,0,0.35)" position={[0, 0.05, 0.06]} />
        <Label text={project.tags.slice(0, 3).join(' · ')} size={0.09} background={null} font="500" position={[0, -0.25, 0.06]} />
      </group>
      <Label text={`#${index + 1}`} size={0.14} background={null} color="#2b2d42" position={[0, 0.7, 0.36]} />
    </group>
  )
}

function RooftopStar() {
  const star = useRef()
  const found = useStore((s) => s.achievements.includes('rooftop'))
  const unlock = useStore((s) => s.unlock)
  const openPanel = useStore((s) => s.openPanel)
  const pos = at([-1.5, H, -1])
  useInteractable('rooftop-star', {
    position: pos,
    radius: 1.6,
    heightRange: 1.5,
    label: found ? 'Admire the view' : 'Grab the star',
    promptHeight: 1.6,
    onInteract: () => {
      unlock('rooftop')
      openPanel({ kind: 'secret', data: secrets.find((s) => s.id === 'rooftop') })
    },
  })
  useFrame(({ clock }) => {
    star.current.rotation.y = clock.elapsedTime * 1.5
    star.current.position.y = H + 0.9 + Math.sin(clock.elapsedTime * 2) * 0.1
  })
  return (
    <mesh ref={star} position={[pos[0], H + 0.9, pos[2]]} scale={found ? 0.6 : 1}>
      <octahedronGeometry args={[0.35, 0]} />
      <meshStandardMaterial color="#ffd166" emissive="#ffb703" emissiveIntensity={1.2} />
    </mesh>
  )
}

export function Workshop() {
  const n = projects.length
  const spacing = 2.6
  return (
    <group>
      <group position={[origin[0], 0, origin[1]]} rotation={[0, rot, 0]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[W / 2, H / 2, D / 2]} position={[0, H / 2, 0]} />
          {/* crate staircase up to the roof */}
          <CuboidCollider args={[0.4, 0.4, 0.4]} position={[W / 2 + 0.5, 0.4, 2.2]} />
          <CuboidCollider args={[0.4, 0.8, 0.4]} position={[W / 2 + 0.5, 0.8, 1.4]} />
          <CuboidCollider args={[0.4, 1.2, 0.4]} position={[W / 2 + 0.5, 1.2, 0.6]} />
        </RigidBody>
        <mesh position={[0, H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[W, H, D]} />
          <meshStandardMaterial ref={occlude} color="#a3c4f3" />
        </mesh>
        <mesh position={[0, H + 0.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[W + 0.4, 0.2, D + 0.4]} />
          <meshStandardMaterial color="#5c677d" />
        </mesh>
        {/* garage door + sign */}
        <mesh position={[0, 1.2, D / 2 + 0.01]}>
          <planeGeometry args={[3.2, 2.4]} />
          <meshStandardMaterial color="#3d4a5c" />
        </mesh>
        {[0.3, 0.7, 1.1, 1.5, 1.9].map((y) => (
          <mesh key={y} position={[0, y, D / 2 + 0.02]}>
            <planeGeometry args={[3.2, 0.04]} />
            <meshStandardMaterial color="#2b3442" />
          </mesh>
        ))}
        <Label text="WORKSHOP · Projects" size={0.4} background="#ff8c42" position={[0, 2.65, D / 2 + 0.03]} />
        {/* crates */}
        {[
          [2.2, 1],
          [1.4, 2],
          [0.6, 3],
        ].map(([z, h]) =>
          Array.from({ length: h }, (_, k) => (
            <mesh key={`${z}-${k}`} position={[W / 2 + 0.5, 0.4 + k * 0.8, z]} castShadow receiveShadow>
              <boxGeometry args={[0.8, 0.8, 0.8]} />
              <meshStandardMaterial color={k % 2 ? '#c8945a' : '#b5793f'} />
            </mesh>
          )),
        )}
        {/* booths in a gentle arc in front of the workshop */}
        {projects.map((p, i) => {
          const off = i - (n - 1) / 2
          return <Booth key={p.id} project={p} index={i} local={[off * spacing, 0, D / 2 + 4.5 + Math.abs(off) * -0.5]} />
        })}
      </group>
      <RooftopStar />
    </group>
  )
}

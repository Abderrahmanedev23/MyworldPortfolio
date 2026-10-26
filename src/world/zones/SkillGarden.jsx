import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Label } from '../Label'
import { Signpost } from './Props'
import { useInteractable } from '../../interaction'
import { useStore } from '../../store'
import { skills } from '../../content'
import { ZONES, faceCenter, toWorld } from '../layout'

const origin = ZONES.garden
const rot = faceCenter(origin)
const at = (local) => toWorld(local, origin, rot)

const CATEGORY_COLORS = ['#ff6b9a', '#ffd166', '#b388ff', '#4cc9f0', '#ff8c42', '#f72585', '#80ed99']
const categories = [...new Set(skills.map((s) => s.category))]
const colorOf = (cat) => CATEGORY_COLORS[categories.indexOf(cat) % CATEGORY_COLORS.length]

const COLS = Math.ceil(Math.sqrt(skills.length))
const GAP = 1.9

function Plant({ skill, local, index }) {
  const openPanel = useStore((s) => s.openPanel)
  const group = useRef()
  const h = 0.35 + skill.level * 0.32 // bigger plant = stronger skill
  const color = colorOf(skill.category)
  useInteractable(`skill-${skill.name}`, {
    position: at([local[0], 0, local[2]]),
    radius: 1,
    label: skill.name,
    promptHeight: h + 0.9,
    onInteract: () => openPanel({ kind: 'skills', data: skill.name, focus: at([local[0], h * 0.7, local[2]]), focusDistance: 3.2 }),
  })
  useFrame(({ clock }) => {
    group.current.rotation.z = Math.sin(clock.elapsedTime * 1.4 + index) * 0.05
  })
  return (
    <group position={local}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.12, 10]} />
        <meshStandardMaterial color="#6d4c41" />
      </mesh>
      <group ref={group}>
        <mesh position={[0, h / 2, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.06, h, 6]} />
          <meshStandardMaterial color="#4f9d4a" />
        </mesh>
        {[0.35, 0.6].map((f, k) => (
          <mesh key={f} position={[k ? -0.13 : 0.13, h * f, 0]} rotation={[0, 0, k ? 0.8 : -0.8]} castShadow>
            <sphereGeometry args={[0.13, 6, 4]} />
            <meshStandardMaterial color="#5fb35a" flatShading />
          </mesh>
        ))}
        <mesh position={[0, h + 0.1, 0]} castShadow>
          <dodecahedronGeometry args={[0.12 + skill.level * 0.05, 0]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      </group>
      <group position={[0.4, 0, 0.45]}>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.04, 0.4, 0.04]} />
          <meshStandardMaterial color="#8a5a3b" />
        </mesh>
        <Label text={skill.name} size={0.14} position={[0, 0.45, 0.03]} background="rgba(255,255,255,0.85)" color="#2b2d42" />
      </group>
    </group>
  )
}

export function SkillGarden() {
  const openPanel = useStore((s) => s.openPanel)
  const rows = Math.ceil(skills.length / COLS)
  const half = [((COLS - 1) * GAP) / 2 + 1.2, ((rows - 1) * GAP) / 2 + 1.2]
  useInteractable('skills-sign', {
    position: at([0, 0, half[1] + 1.4]),
    radius: 1.8,
    label: 'Skill garden',
    promptHeight: 2.2,
    onInteract: () => openPanel({ kind: 'skills', focus: at([0, 0.8, 0]), focusDistance: 7 }),
  })
  // fence posts around the bed, leaving a gap at the front
  const posts = []
  for (let x = -half[0]; x <= half[0] + 0.01; x += 0.9) {
    posts.push([x, -half[1]])
    if (Math.abs(x) > 1) posts.push([x, half[1]])
  }
  for (let z = -half[1] + 0.9; z < half[1]; z += 0.9) {
    posts.push([-half[0], z], [half[0], z])
  }
  return (
    <group position={[origin[0], 0, origin[1]]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[half[0] * 2, half[1] * 2]} />
        <meshStandardMaterial color="#8d6e4f" />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[half[0], 0.3, 0.05]} position={[0, 0.3, -half[1]]} />
        <CuboidCollider args={[0.05, 0.3, half[1]]} position={[-half[0], 0.3, 0]} />
        <CuboidCollider args={[0.05, 0.3, half[1]]} position={[half[0], 0.3, 0]} />
        <CuboidCollider args={[(half[0] - 1) / 2, 0.3, 0.05]} position={[-(half[0] + 1) / 2, 0.3, half[1]]} />
        <CuboidCollider args={[(half[0] - 1) / 2, 0.3, 0.05]} position={[(half[0] + 1) / 2, 0.3, half[1]]} />
      </RigidBody>
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.3, z]} castShadow>
          <boxGeometry args={[0.1, 0.6, 0.1]} />
          <meshStandardMaterial color="#f4f1ea" />
        </mesh>
      ))}
      {skills.map((s, i) => {
        const c = i % COLS
        const r = Math.floor(i / COLS)
        return (
          <Plant
            key={s.name}
            skill={s}
            index={i}
            local={[(c - (COLS - 1) / 2) * GAP, 0, (r - (rows - 1) / 2) * GAP]}
          />
        )
      })}
      <group position={[-1.8, 0, half[1] + 1]}>
        <Signpost width={2.2} boardHeight={0.7} height={1.4}>
          <Label text={'Skill garden'} size={0.3} background={null} />
        </Signpost>
      </group>
    </group>
  )
}

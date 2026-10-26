import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Vector3 } from 'three'
import { Label } from '../Label'
import { Signpost } from './Props'
import { useInteractable } from '../../interaction'
import { playerState, useStore } from '../../store'
import { profile } from '../../content'
import { occlude } from '../occlusion'
import { ZONES, faceCenter, toWorld } from '../layout'

const W = 7 // width (x)
const D = 6 // depth (z)
const H = 3 // wall height
const T = 0.2 // wall thickness
const DOOR = 1.8
const WALL = '#fbeee0'

const origin = ZONES.house
const rot = faceCenter(origin)
const at = (local) => toWorld(local, origin, rot)

// Walls: [center, size, outward normal (local)]
const side = (W - DOOR) / 2
const WALLS = [
  { id: 'back', pos: [0, H / 2, -D / 2], size: [W, H, T], n: [0, 0, -1] },
  { id: 'left', pos: [-W / 2, H / 2, 0], size: [T, H, D], n: [-1, 0, 0] },
  { id: 'right', pos: [W / 2, H / 2, 0], size: [T, H, D], n: [1, 0, 0] },
  { id: 'frontL', pos: [-(DOOR / 2 + side / 2), H / 2, D / 2], size: [side, H, T], n: [0, 0, 1] },
  { id: 'frontR', pos: [DOOR / 2 + side / 2, H / 2, D / 2], size: [side, H, T], n: [0, 0, 1] },
  { id: 'lintel', pos: [0, H - 0.4, D / 2], size: [DOOR, 0.8, T], n: [0, 0, 1] },
]

function Frame({ id, local, color, title, onOpen, size = [0.9, 0.7] }) {
  // trigger spot sits a step into the room so it can't fire through the wall
  const world = at([local[0] + 1.1, 0, local[2]])
  useInteractable(id, {
    position: world,
    radius: 1.1,
    label: `Look at ${title}`,
    promptHeight: 2.2,
    onInteract: () => onOpen(at(local)),
  })
  return (
    <group position={local} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <boxGeometry args={[size[0] + 0.12, size[1] + 0.12, 0.05]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Label text={title} size={0.14} background={null} position={[0, 0, 0.04]} />
    </group>
  )
}

export function House() {
  const openPanel = useStore((s) => s.openPanel)
  const setIndoors = useStore((s) => s.setIndoors)
  const roof = useRef()
  const walls = useRef({})
  const camLocal = useRef(new Vector3())

  useFrame(({ camera }) => {
    // Player position in house space → are we inside?
    const dx = playerState.position.x - origin[0]
    const dz = playerState.position.z - origin[1]
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const lx = dx * c - dz * s
    const lz = dx * s + dz * c
    const inside = Math.abs(lx) < W / 2 && Math.abs(lz) < D / 2 + 0.1 && playerState.position.y < H
    if (inside !== useStore.getState().indoors) setIndoors(inside)
    roof.current.visible = !inside

    // Hide walls standing between the camera and the room while inside.
    const cx = camera.position.x - origin[0]
    const cz = camera.position.z - origin[1]
    camLocal.current.set(cx * c - cz * s, 0, cx * s + cz * c)
    for (const w of WALLS) {
      const m = walls.current[w.id]
      if (!m) continue
      const facing = w.n[0] * camLocal.current.x + w.n[2] * camLocal.current.z > (w.n[0] ? W / 2 : D / 2)
      m.visible = !(inside && facing)
    }
  })

  const about = () => openPanel({ kind: 'about', focus: at([0, 1.7, -D / 2 + 0.2]), focusDistance: 3.5 })
  useInteractable('about-poster', {
    position: at([0, 0, -D / 2 + 1.2]),
    radius: 1.6,
    label: 'Read about me',
    promptHeight: 2.4,
    onInteract: about,
  })

  return (
    <group>
      <group position={[origin[0], 0, origin[1]]} rotation={[0, rot, 0]}>
        <RigidBody type="fixed" colliders={false}>
          {WALLS.map((w) => (
            <CuboidCollider key={w.id} args={w.size.map((v) => v / 2)} position={w.pos} />
          ))}
          {/* bed + desk */}
          <CuboidCollider args={[0.8, 0.3, 1.1]} position={[-2.5, 0.3, -1.7]} />
          <CuboidCollider args={[0.9, 0.4, 0.4]} position={[2.3, 0.4, -2.4]} />
        </RigidBody>

        {/* floor */}
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[W, 0.08, D]} />
          <meshStandardMaterial color="#c9935a" />
        </mesh>
        <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.3, 24]} />
          <meshStandardMaterial color="#ff9fb2" />
        </mesh>

        {WALLS.map((w) => (
          <mesh key={w.id} ref={(m) => (walls.current[w.id] = m)} position={w.pos} castShadow receiveShadow>
            <boxGeometry args={w.size} />
            <meshStandardMaterial ref={occlude} color={WALL} />
            {w.id.startsWith('front') && (
              <mesh position={[0, 0.2, T / 2 + 0.01]}>
                <planeGeometry args={[1.1, 0.9]} />
                <meshStandardMaterial color="#a9e4ff" emissive="#ffd27a" emissiveIntensity={0.15} />
              </mesh>
            )}
          </mesh>
        ))}

        {/* roof */}
        <group ref={roof}>
          <mesh position={[0, H + 1.1, 0]} rotation={[0, Math.PI / 4, 0]} scale={[W * 0.75, 1, D * 0.75]} castShadow>
            <coneGeometry args={[1, 2.2, 4]} />
            <meshStandardMaterial ref={occlude} color="#e05a47" flatShading />
          </mesh>
          <mesh position={[1.8, H + 1.2, -0.8]} castShadow>
            <boxGeometry args={[0.5, 1.4, 0.5]} />
            <meshStandardMaterial color="#8d6e63" />
          </mesh>
        </group>

        {/* furniture */}
        <mesh position={[-2.5, 0.3, -1.7]} castShadow>
          <boxGeometry args={[1.6, 0.5, 2.2]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-2.5, 0.58, -1.2]} castShadow>
          <boxGeometry args={[1.5, 0.12, 1.2]} />
          <meshStandardMaterial color={profile.avatar.hoodie} />
        </mesh>
        <mesh position={[-2.5, 0.62, -2.5]}>
          <boxGeometry args={[0.9, 0.18, 0.45]} />
          <meshStandardMaterial color="#f7f7f7" />
        </mesh>
        <mesh position={[2.3, 0.75, -2.4]} castShadow>
          <boxGeometry args={[1.8, 0.08, 0.8]} />
          <meshStandardMaterial color="#8d6e63" />
        </mesh>
        <mesh position={[2.3, 0.37, -2.4]}>
          <boxGeometry args={[1.7, 0.74, 0.7]} />
          <meshStandardMaterial color="#6d4c41" />
        </mesh>
        <group position={[2.3, 0.8, -2.5]}>
          <mesh position={[0, 0.01, 0.1]}>
            <boxGeometry args={[0.6, 0.02, 0.4]} />
            <meshStandardMaterial color="#cfd8dc" />
          </mesh>
          <mesh position={[0, 0.2, -0.1]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.6, 0.4, 0.02]} />
            <meshStandardMaterial color="#263238" emissive="#4f7cff" emissiveIntensity={0.6} />
          </mesh>
        </group>
        <mesh position={[3.0, 0.35, 1.8]} castShadow>
          <cylinderGeometry args={[0.25, 0.2, 0.5, 8]} />
          <meshStandardMaterial color="#e07a5f" />
        </mesh>
        <mesh position={[3.0, 0.9, 1.8]} castShadow>
          <icosahedronGeometry args={[0.45, 0]} />
          <meshStandardMaterial color="#5fb35a" flatShading />
        </mesh>

        {/* about-me poster on the back wall */}
        <group position={[0, 1.7, -D / 2 + 0.12]}>
          <mesh>
            <boxGeometry args={[2.2, 1.5, 0.05]} />
            <meshStandardMaterial color="#3d405b" />
          </mesh>
          <Label text={'About me'} size={0.3} background={null} position={[0, 0.35, 0.04]} />
          <Label text={profile.name} size={0.22} background={null} font="500" color="#ffd166" position={[0, -0.05, 0.04]} />
          <Label text={profile.role} size={0.16} background={null} font="500" position={[0, -0.35, 0.04]} />
        </group>

        {/* hobby frames on the left wall */}
        {profile.hobbies.map((h, i) => (
          <Frame
            key={h.id}
            id={`hobby-${h.id}`}
            local={[-W / 2 + 0.14, 1.7, 0.2 + (i - (profile.hobbies.length - 1) / 2) * 1.2 + 0.8]}
            color={h.color}
            title={h.title}
            onOpen={(focus) => openPanel({ kind: 'hobby', data: h, focus, focusDistance: 3 })}
          />
        ))}

        {/* doormat + sign */}
        <mesh position={[0, 0.02, D / 2 + 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.4, 0.8]} />
          <meshStandardMaterial color="#a1887f" />
        </mesh>
        <group position={[2.6, 0, D / 2 + 1.4]}>
          <Signpost width={1.7} boardHeight={0.6} height={1.3}>
            <Label text="About me" size={0.3} background={null} />
          </Signpost>
        </group>
      </group>
    </group>
  )
}

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { Vector3 } from 'three'
import { Character } from '../Character'
import { Label } from '../Label'
import { useInteractable } from '../../interaction'
import { playerState, useStore } from '../../store'
import { profile } from '../../content'
import { audio } from '../../audio'
import { NPCS } from '../layout'

const turnTowards = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k

function NPC({ npc }) {
  const body = useRef()
  const visual = useRef()
  const state = useRef({ anim: npc.pose ?? 'idle' }).current
  const openDialogue = useStore((s) => s.openDialogue)
  const quality = useStore((s) => s.settings.quality)
  const seated = !!npc.pose
  const y = npc.y ?? 0
  const pos = useRef(new Vector3(npc.position[0], y, npc.position[1])).current
  const walk = useRef({ target: 1, pause: 0, greeted: false }).current

  useInteractable(npc.id, {
    dynamic: () => [pos.x, pos.y, pos.z],
    radius: npc.run ? 2.6 : 2.2,
    label: `Talk to ${npc.name}`,
    promptHeight: seated ? 1.6 : 2.4,
    onInteract: () => {
      audio.play('open')
      openDialogue({
        npc: { id: npc.id, name: npc.name, emoji: npc.emoji, color: npc.colors.hoodie, voice: npc.voice },
        lines: profile.npcs?.[npc.id] ?? ['Hello there!'],
        focus: [pos.x, pos.y + (seated ? 0.8 : 1.3), pos.z],
        focusDistance: 3.6,
      })
    },
  })

  useFrame((_, delta) => {
    if (seated) {
      state.anim = npc.pose
      return
    }
    const dt = Math.min(delta, 0.05)
    const talking = useStore.getState().dialogue?.npc.id === npc.id
    const dx = playerState.position.x - pos.x
    const dz = playerState.position.z - pos.z
    const d2 = dx * dx + dz * dz
    const r = visual.current.rotation
    // stop for a chat when the player comes close (and wave hello once)
    const stop = talking || d2 < (npc.run ? 10 : 7)
    if (d2 > 49) walk.greeted = false
    if (stop || !npc.route) {
      r.y = turnTowards(r.y, d2 < 64 ? Math.atan2(dx, dz) : npc.facing ?? r.y, Math.min(1, dt * 6))
      if (talking) state.anim = 'cheer'
      else if (!walk.greeted && d2 < 7) {
        walk.greeted = true
        walk.waveUntil = performance.now() + 1800
      }
      if (!talking) state.anim = performance.now() < (walk.waveUntil ?? 0) ? 'wave' : 'idle'
    } else if (walk.pause > 0) {
      walk.pause -= dt
      state.anim = 'idle'
    } else {
      const [tx, tz] = npc.route[walk.target]
      const vx = tx - pos.x
      const vz = tz - pos.z
      const dist = Math.hypot(vx, vz)
      const step = npc.speed * dt
      if (dist <= step) {
        pos.x = tx
        pos.z = tz
        walk.target = (walk.target + 1) % npc.route.length
        if (!npc.noPause) walk.pause = 1 + Math.random() * 2.5
      } else {
        pos.x += (vx / dist) * step
        pos.z += (vz / dist) * step
        r.y = turnTowards(r.y, Math.atan2(vx, vz), Math.min(1, dt * 8))
      }
      state.anim = npc.run ? 'run' : 'walk'
    }
    body.current?.setNextKinematicTranslation({ x: pos.x, y: pos.y, z: pos.z })
  })

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[pos.x, pos.y, pos.z]}>
      <CylinderCollider args={[seated ? 0.4 : 0.7, 0.4]} position={[0, seated ? 0.4 : 0.7, 0]} />
      <group ref={visual} rotation={[0, npc.facing ?? 0, 0]}>
        <Character model={npc.model} state={state} outline={quality === 'high'} />
      </group>
      <Label text={`${npc.emoji} ${npc.name}`} size={0.22} billboard position={[0, seated ? 1.5 : 1.95, 0]} />
    </RigidBody>
  )
}

export function NPCs() {
  return NPCS.map((n) => <NPC key={n.id} npc={n} />)
}

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { Avatar } from '../Avatar'
import { Label } from '../Label'
import { useInteractable } from '../../interaction'
import { playerState, useStore } from '../../store'
import { profile } from '../../content'
import { audio } from '../../audio'
import { NPCS } from '../layout'

function NPC({ npc }) {
  const visual = useRef()
  const state = useRef({ anim: 'idle' }).current
  const openDialogue = useStore((s) => s.openDialogue)
  const quality = useStore((s) => s.settings.quality)
  const [x, z] = npc.position

  useInteractable(npc.id, {
    position: [x, 0, z],
    radius: 2.2,
    label: `Talk to ${npc.name}`,
    promptHeight: 2.4,
    onInteract: () => {
      audio.play('open')
      openDialogue({
        npc: { id: npc.id, name: npc.name, emoji: npc.emoji, color: npc.colors.hoodie, voice: npc.voice },
        lines: profile.npcs?.[npc.id] ?? ['Hello there!'],
        focus: [x, 1.3, z],
        focusDistance: 3.6,
      })
    },
  })

  useFrame(() => {
    const talking = useStore.getState().dialogue?.npc.id === npc.id
    state.anim = talking ? 'wave' : 'idle'
    const dx = playerState.position.x - x
    const dz = playerState.position.z - z
    const near = dx * dx + dz * dz < 36
    const target = near ? Math.atan2(dx, dz) : 0
    const r = visual.current.rotation
    r.y += Math.atan2(Math.sin(target - r.y), Math.cos(target - r.y)) * 0.08
  })

  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.7, 0.4]} position={[0, 0.7, 0]} />
      </RigidBody>
      <group ref={visual}>
        <Avatar colors={npc.colors} state={state} scale={0.95} outline={quality === 'high'} />
      </group>
      <Label text={`${npc.emoji} ${npc.name}`} size={0.22} billboard position={[0, 2, 0]} />
    </group>
  )
}

export function NPCs() {
  return NPCS.map((n) => <NPC key={n.id} npc={n} />)
}

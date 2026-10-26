import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { Avatar } from '../Avatar'
import { Label } from '../Label'
import { useInteractable } from '../../interaction'
import { playerState, useStore } from '../../store'
import { profile } from '../../content'
import { NPCS } from '../layout'

let lineIndex = 0

function NPC({ npc }) {
  const visual = useRef()
  const state = useRef({ anim: 'idle' }).current
  const say = useStore((s) => s.say)
  const speech = useStore((s) => (s.speech?.id === npc.id ? s.speech : null))
  const [x, z] = npc.position

  useInteractable(npc.id, {
    position: [x, 0, z],
    radius: 2.2,
    label: `Talk to ${npc.name}`,
    promptHeight: 2.4,
    onInteract: () => {
      const lines = profile.npcLines
      say({ id: npc.id, text: lines[lineIndex++ % lines.length], key: Date.now() })
      state.anim = 'wave'
      setTimeout(() => (state.anim = 'idle'), 1500)
    },
  })

  // close the bubble after a while
  useEffect(() => {
    if (!speech) return
    const t = setTimeout(() => {
      if (useStore.getState().speech?.key === speech.key) say(null)
    }, 5000)
    return () => clearTimeout(t)
  }, [speech, say])

  useFrame(() => {
    const dx = playerState.position.x - x
    const dz = playerState.position.z - z
    const near = dx * dx + dz * dz < 36
    const target = near ? Math.atan2(dx, dz) : 0
    const r = visual.current.rotation
    r.y += Math.atan2(Math.sin(target - r.y), Math.cos(target - r.y)) * 0.08
    if (speech && !near) say(null)
  })

  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.7, 0.4]} position={[0, 0.7, 0]} />
      </RigidBody>
      <group ref={visual}>
        <Avatar colors={npc.colors} state={state} scale={0.95} />
      </group>
      <Label text={npc.name} size={0.2} billboard position={[0, 1.95, 0]} />
      {speech && (
        <Html position={[0, 2.3, 0]} center zIndexRange={[20, 0]}>
          <div className="speech" key={speech.key}>
            {speech.text}
          </div>
        </Html>
      )}
    </group>
  )
}

export function NPCs() {
  return NPCS.map((n) => <NPC key={n.id} npc={n} />)
}

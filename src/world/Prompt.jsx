import { Html } from '@react-three/drei'
import { useStore, isTouch } from '../store'

/** Floating "Press E" bubble above whatever the player can interact with. */
export function InteractionPrompt() {
  const nearby = useStore((s) => s.nearby)
  const panel = useStore((s) => s.panel)
  const started = useStore((s) => s.started)
  if (!nearby || panel || !started) return null
  const p = nearby.position
  return (
    <Html position={[p.x, p.y + nearby.promptHeight, p.z]} center zIndexRange={[30, 0]}>
      <button className="prompt" onClick={() => nearby.onInteract()} key={nearby.id}>
        <span className="prompt-key">{isTouch ? 'Tap' : 'E'}</span>
        {nearby.label}
      </button>
    </Html>
  )
}

import { Html } from '@react-three/drei'
import { isBusy, isTouch, useStore } from '../store'

/** Floating "E · Talk" bubble above whatever the player can interact with. */
export function InteractionPrompt() {
  const nearby = useStore((s) => s.nearby)
  useStore((s) => [!!s.panel, !!s.dialogue, s.menu, s.phase, !!s.fishing].join()) // re-render when the UI state changes
  if (!nearby || isBusy()) return null
  const p = nearby.position
  return (
    <Html position={[p.x, p.y + nearby.promptHeight, p.z]} center zIndexRange={[30, 0]}>
      <button className="prompt" onClick={() => nearby.onInteract()} key={nearby.id}>
        <span className="keycap">{isTouch ? '✋' : 'E'}</span>
        <span>{nearby.label}</span>
      </button>
    </Html>
  )
}

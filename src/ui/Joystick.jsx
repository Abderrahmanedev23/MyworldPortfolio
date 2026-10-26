import { useRef, useState } from 'react'
import { input, interact } from '../input'
import { useStore } from '../store'

const RADIUS = 55

/** On-screen joystick + action / jump buttons for touch devices. */
export function TouchControls() {
  const nearby = useStore((s) => s.nearby)
  const hidden = useStore((s) => !!s.panel || !!s.menu)
  const dialogue = useStore((s) => !!s.dialogue)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const base = useRef()
  const pointer = useRef(null)

  const update = (e) => {
    const r = base.current.getBoundingClientRect()
    let x = e.clientX - (r.left + r.width / 2)
    let y = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(x, y)
    if (len > RADIUS) {
      x = (x / len) * RADIUS
      y = (y / len) * RADIUS
    }
    setKnob({ x, y })
    input.joystick.x = x / RADIUS
    input.joystick.y = -y / RADIUS
    input.joystick.active = true
  }
  const end = () => {
    pointer.current = null
    setKnob({ x: 0, y: 0 })
    input.joystick.active = false
    input.joystick.x = 0
    input.joystick.y = 0
  }

  if (hidden || dialogue) return null
  return (
    <div className="touch">
      <div
        ref={base}
        className="joystick"
        onPointerDown={(e) => {
          pointer.current = e.pointerId
          e.currentTarget.setPointerCapture(e.pointerId)
          update(e)
        }}
        onPointerMove={(e) => pointer.current === e.pointerId && update(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <div className="touch-buttons">
        <button className="round jump" onPointerDown={() => (input.jump = true)} aria-label="Jump">
          ⤒
        </button>
        <button className={`round action ${nearby ? 'live' : ''}`} onPointerDown={interact} disabled={!nearby} aria-label="Interact">
          ✋
        </button>
      </div>
    </div>
  )
}

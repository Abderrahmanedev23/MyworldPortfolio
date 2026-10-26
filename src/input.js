import { useEffect } from 'react'
import { useStore } from './store'

// Shared input state written by keyboard + on-screen joystick, read every frame by the player.
export const input = {
  forward: 0,
  right: 0,
  run: false,
  jump: false,
  wave: false,
  joystick: { x: 0, y: 0, active: false },
  cameraYaw: 0,
  cameraPitch: 0.42,
  cameraDistance: 9,
}

const keys = new Set()

function updateAxes() {
  const has = (...codes) => codes.some((c) => keys.has(c))
  input.forward = (has('KeyW', 'ArrowUp', 'KeyZ') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0)
  input.right = (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft', 'KeyQ') ? 1 : 0)
  input.run = has('ShiftLeft', 'ShiftRight')
}

// Movement vector in camera space, combining keyboard and joystick.
export function getMoveInput() {
  let f = input.forward
  let r = input.right
  if (input.joystick.active) {
    f = input.joystick.y
    r = input.joystick.x
  }
  const len = Math.hypot(f, r)
  if (len > 1) {
    f /= len
    r /= len
  }
  const run = input.run || (input.joystick.active && len > 0.85)
  return { f, r, len: Math.min(len, 1), run }
}

export function interact() {
  const { panel, closePanel, nearby, started } = useStore.getState()
  if (!started) return
  if (panel) return closePanel()
  nearby?.onInteract?.()
}

export function useKeyboard() {
  useEffect(() => {
    const isTyping = (e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)
    const down = (e) => {
      if (isTyping(e)) return
      if (e.code === 'Escape') return useStore.getState().closePanel()
      if (e.code === 'KeyE' || e.code === 'Enter') {
        if (!e.repeat) interact()
        return
      }
      if (useStore.getState().panel) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (!e.repeat) input.jump = true
      }
      if (e.code === 'KeyR' && !e.repeat) input.wave = true
      keys.add(e.code)
      updateAxes()
    }
    const up = (e) => {
      keys.delete(e.code)
      updateAxes()
    }
    const blur = () => {
      keys.clear()
      updateAxes()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])
}

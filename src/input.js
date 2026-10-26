import { useEffect } from 'react'
import { playerState, useStore } from './store'
import { audio } from './audio'

// Shared input state written by keyboard, gamepad and the on-screen joystick,
// read every frame by the player and camera.
export const input = {
  forward: 0,
  right: 0,
  run: false,
  jump: false,
  wave: false,
  joystick: { x: 0, y: 0, active: false },
  pad: { x: 0, y: 0, lookX: 0, lookY: 0, run: false, active: false },
  cameraYaw: 0,
  cameraPitch: 0.45,
  cameraDistance: 9,
}

const keys = new Set()

function updateAxes() {
  const has = (...codes) => codes.some((c) => keys.has(c))
  input.forward = (has('KeyW', 'ArrowUp', 'KeyZ') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0)
  input.right = (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft', 'KeyQ') ? 1 : 0)
  input.run = has('ShiftLeft', 'ShiftRight')
}

// Movement vector in camera space, combining keyboard, gamepad and joystick.
export function getMoveInput() {
  let f = input.forward
  let r = input.right
  let run = input.run
  if (input.joystick.active) {
    f = input.joystick.y
    r = input.joystick.x
  } else if (input.pad.active) {
    f = -input.pad.y
    r = input.pad.x
    run = run || input.pad.run
  }
  const len = Math.hypot(f, r)
  if (len > 1) {
    f /= len
    r /= len
  }
  run = run || (input.joystick.active && len > 0.85)
  return { f, r, len: Math.min(len, 1), run }
}

/** The one "action" button: advance dialogue, close a panel, or interact. */
export function interact() {
  const s = useStore.getState()
  if (s.phase !== 'playing' || s.menu) return
  if (s.fishing) return window.dispatchEvent(new Event('fish-press'))
  if (s.tour && !s.panel) return window.dispatchEvent(new Event('tour-next'))
  if (playerState.boating && !s.panel && !s.dialogue) return window.dispatchEvent(new Event('boat-exit'))
  if (s.dialogue) return window.dispatchEvent(new Event('dialogue-advance'))
  if (s.panel) {
    audio.play('close')
    return s.closePanel()
  }
  s.nearby?.onInteract?.()
}

/** Back / Esc: close the top-most layer, or open the pause menu. */
export function back() {
  const s = useStore.getState()
  if (s.phase !== 'playing') return
  audio.play('close')
  if (s.menu) return s.setMenu(null)
  if (s.fishing) return window.dispatchEvent(new Event('fish-cancel'))
  if (s.photo) return s.setPhoto(false)
  if (s.tour && !s.panel) return s.setTour(null)
  if (s.dialogue) return s.closeDialogue()
  if (s.panel) return s.closePanel()
  s.setMenu('pause')
}

export function toggleMap() {
  const s = useStore.getState()
  if (s.phase !== 'playing') return
  audio.play(s.menu === 'map' ? 'close' : 'open')
  s.setMenu(s.menu === 'map' ? null : 'map')
}

// ---------- gamepad ----------
const prevButtons = []
const dead = (v) => (Math.abs(v) < 0.18 ? 0 : v)

/** Poll the first connected gamepad (called once per frame). */
export function pollGamepad() {
  const pads = navigator.getGamepads?.() ?? []
  const pad = [...pads].find(Boolean)
  if (!pad) {
    input.pad.active = false
    return
  }
  const [lx = 0, ly = 0, rx = 0, ry = 0] = pad.axes
  input.pad.x = dead(lx)
  input.pad.y = dead(ly)
  input.pad.lookX = dead(rx)
  input.pad.lookY = dead(ry)
  input.pad.active = Math.hypot(input.pad.x, input.pad.y) > 0
  const pressed = (i) => !!pad.buttons[i]?.pressed
  const tapped = (i) => pressed(i) && !prevButtons[i]
  input.pad.run = pressed(5) || pressed(7) || pressed(10) // RB / RT / L3
  if (tapped(0)) {
    if (useStore.getState().intro) window.dispatchEvent(new Event('intro-skip'))
    else if (useStore.getState().phase !== 'playing') window.dispatchEvent(new Event('game-start'))
    else input.jump = true // A
  }
  if (tapped(2) || tapped(1)) interact() // X or B
  if (tapped(3)) input.wave = true // Y
  if (tapped(9)) back() // Start
  if (tapped(8)) toggleMap() // Select / View
  pad.buttons.forEach((b, i) => (prevButtons[i] = b.pressed))
}

export function useKeyboard() {
  useEffect(() => {
    const isTyping = (e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)
    const down = (e) => {
      if (isTyping(e)) {
        if (e.code === 'Escape') e.target.blur()
        return
      }
      const s = useStore.getState()
      if (s.phase === 'title' && !e.repeat) {
        window.dispatchEvent(new Event('game-start'))
        return
      }
      if (s.intro) {
        if (['Escape', 'Space', 'Enter', 'KeyE'].includes(e.code) && !e.repeat) window.dispatchEvent(new Event('intro-skip'))
        return
      }
      if (e.code === 'Escape' || e.code === 'KeyP') return back()
      if (e.code === 'KeyM' && !e.repeat) return toggleMap()
      if (e.code === 'KeyC' && !e.repeat && !s.menu && !s.tour) {
        audio.play(s.photo ? 'close' : 'open')
        if (s.photo) playerState.photoPose = null
        return s.setPhoto(!s.photo)
      }
      if (e.code === 'KeyE' || e.code === 'Enter') {
        if (!e.repeat) interact()
        return
      }
      if (s.dialogue && e.code === 'Space') {
        e.preventDefault()
        if (!e.repeat) interact()
        return
      }
      if (s.panel || s.menu) return
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

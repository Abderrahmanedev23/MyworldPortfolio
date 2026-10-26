import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { input } from '../input'
import { playerState, useStore } from '../store'
import { uniforms } from './shaders'

const desired = new Vector3()
const look = new Vector3()
const dir = new Vector3()
const UP = new Vector3(0, 1, 0)

// Third-person follow camera. Drag to orbit, wheel / pinch to zoom, right stick on a gamepad.
// On the title screen it slowly circles the island; when a panel or dialogue is
// open it glides over to frame what you're looking at.
export function CameraRig() {
  const { camera, gl } = useThree()
  const lookAt = useRef(new Vector3(0, 1, 0))
  const base = useRef(new Vector3(0, 15, 34)) // smoothed camera position before the landing dip

  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map()
    let pinch = 0
    const sens = () => useStore.getState().settings.sensitivity ?? 1
    // photo mode gets a wider camera range
    const zoomMin = () => (useStore.getState().photo ? 1.8 : 4)
    const zoomMax = () => (useStore.getState().photo ? 26 : 16)
    const pitchMin = () => (useStore.getState().photo ? -0.05 : 0.12)
    const down = (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      el.setPointerCapture(e.pointerId)
    }
    const move = (e) => {
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const other = a === prev ? b : a
        const d = Math.hypot(e.clientX - other.x, e.clientY - other.y)
        if (pinch) input.cameraDistance = MathUtils.clamp(input.cameraDistance * (pinch / d), zoomMin(), zoomMax())
        pinch = d
      } else {
        input.cameraYaw -= (e.clientX - prev.x) * 0.006 * sens()
        input.cameraPitch = MathUtils.clamp(input.cameraPitch + (e.clientY - prev.y) * 0.004 * sens(), pitchMin(), 1.45)
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    const up = (e) => {
      pointers.delete(e.pointerId)
      pinch = 0
    }
    const wheel = (e) => {
      e.preventDefault()
      input.cameraDistance = MathUtils.clamp(input.cameraDistance + e.deltaY * 0.01, zoomMin(), zoomMax())
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    const { panel, dialogue, indoors, phase, settings, tour, photo } = useStore.getState()
    const p = playerState.position

    // gamepad right stick
    if (input.pad.lookX || input.pad.lookY) {
      input.cameraYaw -= input.pad.lookX * dt * 2.6 * settings.sensitivity
      input.cameraPitch = MathUtils.clamp(input.cameraPitch + input.pad.lookY * dt * 1.6, 0.12, 1.3)
    }

    const focus = panel?.focus ?? dialogue?.focus ?? tour?.focus
    let speed = 7
    if (phase !== 'playing') {
      // title screen: slow orbit around the island
      const a = t * 0.06
      desired.set(Math.sin(a) * 34, 15 + Math.sin(t * 0.1) * 2, Math.cos(a) * 34)
      look.set(0, 1, 0)
      speed = 1.5
    } else if (focus) {
      const f = focus
      dir.set(p.x - f[0], 0, p.z - f[2])
      if (dir.lengthSq() < 0.01) dir.set(Math.sin(input.cameraYaw), 0, Math.cos(input.cameraYaw))
      dir.normalize()
      // conversations: swing round to the side so both characters are in shot
      if (dialogue && !panel) dir.applyAxisAngle(UP, 0.85)
      const dist = panel?.focusDistance ?? dialogue?.focusDistance ?? (tour ? 11 : 4.5)
      // nudge sideways so the subject isn't hidden behind the side panel
      const side = panel && window.innerWidth > 640 ? 0.9 : 0
      desired.set(f[0] + dir.x * dist - dir.z * side, f[1] + dist * 0.35, f[2] + dir.z * dist + dir.x * side)
      look.set(f[0] - dir.z * side, f[1], f[2] + dir.x * side)
      speed = 3.5
    } else {
      const pitch = indoors ? Math.max(input.cameraPitch, 0.95) : input.cameraPitch
      const d = indoors ? Math.min(input.cameraDistance, 7) : input.cameraDistance
      desired.set(
        p.x + Math.sin(input.cameraYaw) * Math.cos(pitch) * d,
        p.y + 0.6 + Math.sin(pitch) * d,
        p.z + Math.cos(input.cameraYaw) * Math.cos(pitch) * d,
      )
      look.set(p.x, p.y + (photo ? 0.3 : 0.6), p.z)
    }

    // little camera dip when landing from a big jump
    const sinceLand = t - playerState.landedAt
    const dip = sinceLand < 0.35 ? Math.sin((sinceLand / 0.35) * Math.PI) * 0.18 * (playerState.landImpact ?? 0) : 0

    const k = 1 - Math.exp(-speed * dt)
    base.current.lerp(desired, k)
    lookAt.current.lerp(look, k)
    camera.position.copy(base.current)
    camera.position.y -= dip
    camera.lookAt(lookAt.current)

    uniforms.uOccCam.value.copy(camera.position)
    uniforms.uOccTarget.value.set(p.x, p.y + 0.3, p.z)
    uniforms.uOccRadius.value = focus || phase !== 'playing' || photo ? 0 : 1.6
  })

  return null
}

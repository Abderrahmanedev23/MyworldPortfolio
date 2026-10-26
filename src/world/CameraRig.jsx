import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { input } from '../input'
import { playerState, useStore } from '../store'
import { occlusionUniforms } from './occlusion'

const desired = new Vector3()
const look = new Vector3()
const dir = new Vector3()

// Third-person follow camera. Drag to orbit, wheel / pinch to zoom.
// When a panel is open it glides over to frame the object being looked at.
export function CameraRig() {
  const { camera, gl } = useThree()
  const lookAt = useRef(new Vector3(0, 1, 0))

  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map()
    let pinch = 0
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
        if (pinch) input.cameraDistance = MathUtils.clamp(input.cameraDistance * (pinch / d), 4, 18)
        pinch = d
      } else {
        input.cameraYaw -= (e.clientX - prev.x) * 0.006
        input.cameraPitch = MathUtils.clamp(input.cameraPitch + (e.clientY - prev.y) * 0.004, 0.1, 1.3)
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    const up = (e) => {
      pointers.delete(e.pointerId)
      pinch = 0
    }
    const wheel = (e) => {
      e.preventDefault()
      input.cameraDistance = MathUtils.clamp(input.cameraDistance + e.deltaY * 0.01, 4, 18)
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

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const { panel, indoors } = useStore.getState()
    const p = playerState.position

    if (panel?.focus) {
      const f = panel.focus
      dir.set(p.x - f[0], 0, p.z - f[2])
      if (dir.lengthSq() < 0.01) dir.set(Math.sin(input.cameraYaw), 0, Math.cos(input.cameraYaw))
      dir.normalize()
      const dist = panel.focusDistance ?? 4.5
      desired.set(f[0] + dir.x * dist, f[1] + dist * 0.35, f[2] + dir.z * dist)
      look.set(f[0], f[1], f[2])
    } else {
      const pitch = indoors ? Math.max(input.cameraPitch, 0.95) : input.cameraPitch
      const d = indoors ? Math.min(input.cameraDistance, 7) : input.cameraDistance
      desired.set(
        p.x + Math.sin(input.cameraYaw) * Math.cos(pitch) * d,
        p.y + 0.6 + Math.sin(pitch) * d,
        p.z + Math.cos(input.cameraYaw) * Math.cos(pitch) * d,
      )
      look.set(p.x, p.y + 0.6, p.z)
    }

    const k = 1 - Math.exp(-(panel ? 3.5 : 7) * dt)
    camera.position.lerp(desired, k)
    lookAt.current.lerp(look, k)
    camera.lookAt(lookAt.current)

    occlusionUniforms.uOccCam.value.copy(camera.position)
    occlusionUniforms.uOccTarget.value.set(p.x, p.y + 0.3, p.z)
    occlusionUniforms.uOccRadius.value = panel ? 0 : 1.6
  })

  return null
}

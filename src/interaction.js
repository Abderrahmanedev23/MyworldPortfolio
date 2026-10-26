import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { isBusy, playerState, useStore } from './store'
import { audio } from './audio'
import { AREAS } from './world/layout'

// Registry of everything the player can interact with. One manager picks the
// nearest in-range entry each frame, so prompts never overlap.
const registry = new Map()

/**
 * Register an interactable spot.
 * @param {string} id unique id
 * @param {object} opts { position: [x,y,z], radius, label, onInteract, promptHeight, enabled }
 */
export function useInteractable(id, opts) {
  const ref = useRef(opts)
  ref.current = opts
  useEffect(() => {
    const entry = {
      id,
      get position() {
        return ref.current.vec
      },
      get opts() {
        return ref.current
      },
    }
    registry.set(id, entry)
    return () => {
      registry.delete(id)
      const { nearby, setNearby } = useStore.getState()
      if (nearby?.id === id) setNearby(null)
    }
  }, [id])
  // cache a Vector3 for the position
  if (!ref.current.vec) ref.current.vec = new Vector3()
  ref.current.vec.set(...opts.position)
}

const tmp = new Vector3()

export function InteractionManager() {
  useFrame(() => {
    const { nearby, setNearby } = useStore.getState()
    if (isBusy()) return
    let best = null
    let bestDist = Infinity
    for (const entry of registry.values()) {
      const o = entry.opts
      if (o.enabled === false) continue
      tmp.copy(entry.position)
      const dx = tmp.x - playerState.position.x
      const dz = tmp.z - playerState.position.z
      const dy = Math.abs(tmp.y - playerState.position.y)
      const d = Math.hypot(dx, dz)
      if (d < (o.radius ?? 2) && dy < (o.heightRange ?? 2.5) && d < bestDist) {
        best = entry
        bestDist = d
      }
    }
    if ((best?.id ?? null) !== (nearby?.id ?? null)) {
      if (best) audio.play('prompt')
      setNearby(
        best
          ? {
              id: best.id,
              label: best.opts.label,
              position: best.position.clone(),
              promptHeight: best.opts.promptHeight ?? 2,
              onInteract: () => registry.get(best.id)?.opts.onInteract?.(),
            }
          : null,
      )
    }
  })
  return null
}

/** Tracks which named area (AREAS in layout.js) the player is standing in. */
export function AreaTracker() {
  useFrame(() => {
    const { area, setArea, achievements } = useStore.getState()
    const p = playerState.position
    let found = null
    for (const a of AREAS) {
      if (a.secret && !achievements.includes(a.secret)) continue
      if (Math.hypot(p.x - a.pos[0], p.z - a.pos[1]) < a.r) {
        found = a.id
        break
      }
    }
    if (found !== area) setArea(found)
  })
  return null
}

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { Vector3 } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { playerState } from '../store'
import { ISLAND_RADIUS } from './layout'

// Low poly fox by PixelMannen / tomkranis, rigged by @AsoboStudio & @scurest (CC-BY 4.0).
const FOX = '/models/fox.glb'
useGLTF.preload(FOX)

const target = new Vector3()
const dir = new Vector3()

/** A fox companion that trots after you, waits on the beach while you swim, and looks around when you stop. */
export function Pet() {
  const group = useRef()
  const { scene, animations } = useGLTF(FOX)
  const fox = useMemo(() => {
    const c = cloneSkinned(scene)
    c.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.frustumCulled = false
      }
    })
    return c
  }, [scene])
  const { actions } = useAnimations(animations, group)
  const pos = useRef(new Vector3(1.5, 0, 9))
  const current = useRef(null)
  const play = (name, speed = 1) => {
    const a = actions[name]
    if (!a) return
    a.timeScale = speed
    if (current.current === name) return
    a.reset().fadeIn(0.25).play()
    if (current.current) actions[current.current]?.fadeOut(0.25)
    current.current = name
  }
  useEffect(() => {
    actions.Survey?.play()
    current.current = 'Survey'
  }, [actions])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = playerState.position
    const behind = playerState.facing + Math.PI + 0.7
    target.set(p.x + Math.sin(behind) * 1.4, 0, p.z + Math.cos(behind) * 1.4)
    // on the dock: walk on the planks; in the sea: wait at the water's edge
    const onDock = p.x > 28 && Math.abs(p.z) < 1.1 && !playerState.swimming
    target.y = onDock ? 0.12 : 0
    if (onDock) target.z = Math.max(-0.7, Math.min(0.7, target.z))
    const tr = Math.hypot(target.x, target.z)
    if (!onDock && tr > ISLAND_RADIUS - 1) target.multiplyScalar((ISLAND_RADIUS - 1) / tr)
    if (playerState.swimming) target.y = 0

    const d = target.distanceTo(pos.current)
    if (d > 25) pos.current.copy(target) // caught up after fast travel
    const r = group.current.rotation
    if (d > 0.45) {
      const speed = Math.min(d * 2.4, 8)
      dir.copy(target).sub(pos.current).normalize()
      pos.current.addScaledVector(dir, speed * dt)
      const yaw = Math.atan2(dir.x, dir.z)
      r.y += Math.atan2(Math.sin(yaw - r.y), Math.cos(yaw - r.y)) * Math.min(1, dt * 10)
      if (speed > 4.2) play('Run', speed / 6)
      else play('Walk', Math.max(0.6, speed / 2))
    } else {
      const look = Math.atan2(p.x - pos.current.x, p.z - pos.current.z)
      r.y += Math.atan2(Math.sin(look - r.y), Math.cos(look - r.y)) * Math.min(1, dt * 3)
      play('Survey')
    }
    group.current.position.copy(pos.current)
  })

  return (
    <group ref={group}>
      <primitive object={fox} scale={0.0065} />
    </group>
  )
}

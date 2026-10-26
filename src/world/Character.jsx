import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { BackSide, LoopOnce, LoopRepeat, MeshBasicMaterial, SkinnedMesh } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

// Character models: KayKit Character Pack "Adventurers" (CC0), optimised by scripts/build-models.mjs.
export const MODELS = {
  player: '/models/player.glb',
  mayor: '/models/mayor.glb',
  gardener: '/models/gardener.glb',
  fisher: '/models/fisher.glb',
  jogger: '/models/jogger.glb',
}
Object.values(MODELS).forEach((url) => useGLTF.preload(url))

// game state → animation clip
const CLIPS = {
  idle: 'Idle',
  walk: 'Walking_A',
  run: 'Running_A',
  jump: 'Jump_Idle',
  wave: 'Cheer',
  cheer: 'Cheer',
  talk: 'Interact',
  sit: 'Sit_Chair_Idle',
  sitFloor: 'Sit_Floor_Idle',
  swim: 'Running_B',
  tread: 'Idle',
  cast: 'Throw',
  reel: 'Use_Item',
  wait: 'Idle',
  pickup: 'PickUp',
}
const ONE_SHOT = new Set(['Throw', 'PickUp'])
const SPEED = { Running_B: 0.55, Walking_A: 1.15 }

const INK = '#2a2236'

/** Inverted-hull outline that follows the skeleton (cartoon ink line). */
function addOutlines(root, thickness) {
  const mat = new MeshBasicMaterial({ color: INK, side: BackSide })
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\ntransformed += normalize(normal) * ${thickness.toFixed(4)};`,
    )
  }
  const meshes = []
  root.traverse((o) => o.isSkinnedMesh && meshes.push(o))
  for (const m of meshes) {
    const o = new SkinnedMesh(m.geometry, mat)
    o.bind(m.skeleton, m.bindMatrix)
    o.frustumCulled = false
    o.userData.outline = true
    m.parent.add(o)
  }
}

/**
 * Animated character. `state.anim` picks the clip (see CLIPS); `state.animSpeed`
 * optionally scales playback (e.g. walk speed).
 */
export function Character({ model = 'player', state, scale = 0.68, outline = false, onReady, ...props }) {
  const group = useRef()
  const { scene, animations } = useGLTF(MODELS[model] ?? model)
  const clone = useMemo(() => {
    const c = cloneSkinned(scene)
    c.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        o.frustumCulled = false
      }
    })
    return c
  }, [scene])
  useEffect(() => {
    onReady?.(clone)
  }, [clone, onReady])
  useEffect(() => {
    if (!outline) return
    addOutlines(clone, 0.022)
    return () => {
      const extra = []
      clone.traverse((o) => o.userData.outline && extra.push(o))
      extra.forEach((o) => o.parent.remove(o))
    }
  }, [clone, outline])

  const { actions } = useAnimations(animations, group)
  const current = useRef(null)

  useFrame(() => {
    const name = CLIPS[state.anim] ?? 'Idle'
    // (re)start when the wanted clip changes, or if something stopped a looping clip
    const stopped = !ONE_SHOT.has(name) && actions[name] && !actions[name].isRunning()
    if ((name !== current.current || stopped) && actions[name]) {
      const next = actions[name]
      const prev = current.current && current.current !== name && actions[current.current]
      next.reset()
      next.setLoop(ONE_SHOT.has(name) ? LoopOnce : LoopRepeat, Infinity)
      next.clampWhenFinished = ONE_SHOT.has(name)
      next.timeScale = SPEED[name] ?? 1
      next.fadeIn(prev ? 0.22 : 0).play()
      if (prev) prev.fadeOut(0.22)
      current.current = name
    }
    const a = current.current && actions[current.current]
    if (a && state.animSpeed) a.timeScale = (SPEED[current.current] ?? 1) * state.animSpeed
  })

  return (
    <group ref={group} {...props}>
      <primitive object={clone} scale={scale} />
    </group>
  )
}

import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { AdaptiveDpr } from '@react-three/drei'
import { Island } from './Island'
import { Player } from './Player'
import { CameraRig } from './CameraRig'
import { Pet } from './Pet'
import { Ball } from './Ball'
import { InteractionPrompt } from './Prompt'
import { Birds, Clouds, DayNight, Footprints } from './Ambient'
import { Plaza } from './zones/Plaza'
import { House } from './zones/House'
import { Workshop } from './zones/Workshop'
import { SkillGarden } from './zones/SkillGarden'
import { MilestoneRoad } from './zones/MilestoneRoad'
import { ContactTower } from './zones/ContactTower'
import { Secrets } from './zones/Secrets'
import { NPCs } from './zones/NPCs'
import { InteractionManager } from '../interaction'
import { useStore } from '../store'

function Ready() {
  const setReady = useStore((s) => s.setReady)
  useEffect(() => setReady(), [setReady])
  return null
}

export function World() {
  const quality = useStore((s) => s.quality)
  const started = useStore((s) => s.started)
  const high = quality === 'high'
  return (
    <Canvas
      shadows={high}
      dpr={high ? [1, 2] : [0.75, 1.25]}
      gl={{ antialias: high, powerPreference: 'high-performance' }}
      camera={{ fov: 50, near: 0.1, far: 600, position: [0, 10, 20] }}
    >
      <AdaptiveDpr pixelated />
      <DayNight shadows={high} />
      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]} colliders={false} paused={!started}>
          <Island />
          <Plaza />
          <House />
          <Workshop />
          <SkillGarden />
          <MilestoneRoad />
          <ContactTower />
          <Secrets />
          <NPCs />
          <Ball />
          <Player />
        </Physics>
        <Pet />
        <Footprints />
        <Clouds />
        <Birds />
        <InteractionManager />
        <InteractionPrompt />
        <CameraRig />
        <Ready />
      </Suspense>
    </Canvas>
  )
}

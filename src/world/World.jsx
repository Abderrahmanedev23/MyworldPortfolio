import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { Island } from './Island'
import { Player } from './Player'
import { CameraRig } from './CameraRig'
import { Pet } from './Pet'
import { Ball } from './Ball'
import { Dust, WaterFx } from './Particles'
import { Fishing } from './Fishing'
import { Seagulls } from './Seagulls'
import { Butterflies, Crabs, Dolphins } from './Animals'
import { Boat } from './Boat'
import { Islet } from './zones/Islet'
import { Rain, Rainbow, WeatherController } from './Weather'
import { Effects } from './Effects'
import { InteractionPrompt } from './Prompt'
import { Clouds, DayNight, FallingLeaves, Fireflies, Footprints, ShaderClock } from './Ambient'
import { Plaza } from './zones/Plaza'
import { House } from './zones/House'
import { Workshop } from './zones/Workshop'
import { SkillGarden } from './zones/SkillGarden'
import { MilestoneRoad } from './zones/MilestoneRoad'
import { ContactTower } from './zones/ContactTower'
import { Secrets } from './zones/Secrets'
import { NPCs } from './zones/NPCs'
import { AreaTracker, InteractionManager } from '../interaction'
import { useStore } from '../store'
import { glRef } from './glRef'

const DPR = { low: [0.75, 1], medium: [1, 1.5], high: [1, 2] }
const LOWER = { high: 'medium', medium: 'low' }

/** Drops the graphics preset one step if the frame rate stays low (once per session per step). */
function AutoQuality() {
  const onDecline = () => {
    const { settings, setSetting, showToast, phase } = useStore.getState()
    const next = LOWER[settings.quality]
    if (!next || phase === 'loading') return
    setSetting('quality', next)
    showToast({ title: 'Graphics adjusted', text: `Switched to ${next} quality for smoother play. Change it in the pause menu.`, icon: '⚙' })
  }
  return <PerformanceMonitor ms={400} iterations={8} threshold={0.75} bounds={() => [28, 50]} flipflops={2} onDecline={onDecline} />
}

/** Marks the world as ready once everything has mounted and shaders are compiled. */
function Ready() {
  const setReady = useStore((s) => s.setReady)
  const { gl, scene, camera } = useThree()
  glRef.current = gl
  if (import.meta.env.DEV) window.__three = { gl, scene, camera }
  useEffect(() => {
    let cancelled = false
    const done = () => !cancelled && requestAnimationFrame(() => requestAnimationFrame(setReady))
    if (gl.compileAsync) gl.compileAsync(scene, camera).then(done, done)
    else done()
    return () => {
      cancelled = true
    }
  }, [gl, scene, camera, setReady])
  return null
}

export function World() {
  const quality = useStore((s) => s.settings.quality)
  const paused = useStore((s) => !!s.menu)
  const high = quality === 'high'
  return (
    <Canvas
      shadows={quality !== 'low' ? 'soft' : false}
      dpr={DPR[quality]}
      gl={{ antialias: quality === 'low', powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: true }}
      camera={{ fov: 45, near: 0.1, far: 600, position: [0, 15, 34] }}
    >
      <DayNight />
      <WeatherController />
      <ShaderClock />
      {!import.meta.env.DEV && <AutoQuality />}
      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]} colliders={false} paused={paused}>
          <Island />
          <Plaza />
          <House />
          <Workshop />
          <SkillGarden />
          <MilestoneRoad />
          <ContactTower />
          <Secrets />
          <Islet />
          <NPCs />
          <Ball />
          <Player />
        </Physics>
        <Pet />
        <Dust />
        <Footprints />
        <Clouds />
        <Seagulls />
        <Butterflies count={high ? 16 : 9} />
        <Crabs />
        <Dolphins />
        <WaterFx />
        <Fishing />
        <Boat />
        <Fireflies count={high ? 80 : 40} />
        <FallingLeaves count={high ? 70 : 35} />
        <Rain />
        <Rainbow />
        <InteractionManager />
        <AreaTracker />
        <InteractionPrompt />
        <CameraRig />
        <Effects />
        <Ready />
      </Suspense>
    </Canvas>
  )
}

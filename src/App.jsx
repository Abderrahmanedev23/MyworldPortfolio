import { Component, Suspense, lazy, useEffect, useState } from 'react'
import { HUD } from './ui/HUD'
import { Panel } from './ui/Panel'
import { Dialogue } from './ui/Dialogue'
import { PauseMenu } from './ui/PauseMenu'
import { MapScreen } from './ui/MapScreen'
import { PhotoMode } from './ui/PhotoMode'
import { TourCard, startTour } from './ui/Tour'
import { LoadingScreen, TitleScreen } from './ui/Boot'
import { ClassicSite } from './ui/ClassicSite'
import { useKeyboard } from './input'
import { useStore } from './store'
import { audio } from './audio'

// The 3D world (three.js + physics) is split out so the classic site loads fast.
let worldLoaded = false
const World = lazy(() =>
  import('./world/World').then((m) => {
    worldLoaded = true
    return { default: m.World }
  }),
)

const webgl = (() => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
})()

/** If the 3D world ever crashes, offer the classic site instead of a blank screen. */
class WorldBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error) {
    console.error(error)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="boot loading">
        <div className="boot-inner">
          <div className="loader-island">🏝️</div>
          <h1 className="logo small">The island couldn't load</h1>
          <p className="tip">Your browser had trouble with the 3D world. The classic site has everything too.</p>
          <a className="btn big" href="#/classic">
            Open the classic site
          </a>
        </div>
      </div>
    )
  }
}

function useRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash.startsWith('#/classic') ? 'classic' : 'world'
}

function Game() {
  const phase = useStore((s) => s.phase)
  const ready = useStore((s) => s.ready)
  const menu = useStore((s) => s.menu)
  const fade = useStore((s) => s.fade)
  const photo = useStore((s) => s.photo)
  const settings = useStore((s) => s.settings)
  const [, force] = useState(0)
  useKeyboard()

  // re-render once the world chunk has arrived (drives the loading bar)
  useEffect(() => {
    if (worldLoaded) return
    const id = setInterval(() => {
      if (!worldLoaded) return
      clearInterval(id)
      force((n) => n + 1)
    }, 100)
    return () => clearInterval(id)
  }, [])

  // loading → title once everything is compiled (keep the bar up for a moment)
  useEffect(() => {
    if (!ready || phase !== 'loading') return
    const t = setTimeout(() => useStore.setState({ phase: 'title' }), 900)
    return () => clearTimeout(t)
  }, [ready, phase])

  // title → playing (button, any key, tap, gamepad A). Starting audio needs this user gesture.
  useEffect(() => {
    const start = (e) => {
      if (useStore.getState().phase !== 'title') return
      audio.init()
      audio.play('open')
      useStore.getState().start()
      if (e?.detail?.tour) setTimeout(startTour, 500)
    }
    window.addEventListener('game-start', start)
    return () => window.removeEventListener('game-start', start)
  }, [])

  useEffect(() => {
    audio.setVolumes({ music: settings.music, sfx: settings.sfx, muted: settings.muted })
  }, [settings.music, settings.sfx, settings.muted])

  return (
    <div className="app">
      <WorldBoundary>
        <Suspense fallback={null}>
          <World />
        </Suspense>
      </WorldBoundary>
      {phase === 'playing' && photo && <PhotoMode />}
      {phase === 'playing' && !photo && (
        <>
          <HUD />
          <Dialogue />
          <TourCard />
          <Panel />
          {menu === 'pause' && <PauseMenu />}
          {menu === 'map' && <MapScreen />}
        </>
      )}
      {phase === 'title' && <TitleScreen />}
      {phase === 'loading' && <LoadingScreen worldLoaded={worldLoaded} />}
      <div className={`fade ${fade ? 'on' : ''}`} />
    </div>
  )
}

export default function App() {
  const route = useRoute()
  useEffect(() => {
    document.body.classList.toggle('classic-mode', route === 'classic')
    window.scrollTo(0, 0)
  }, [route])
  if (route === 'classic' || !webgl) return <ClassicSite />
  return <Game />
}

import { Suspense, lazy, useEffect, useState } from 'react'
import { HUD } from './ui/HUD'
import { Panel } from './ui/Panel'
import { Intro } from './ui/Intro'
import { ClassicSite } from './ui/ClassicSite'
import { useKeyboard } from './input'
import { useStore } from './store'
import { startAmbient, stopAmbient } from './audio'

// The 3D world (three.js + physics) is split out so the classic site loads fast.
const World = lazy(() => import('./world/World').then((m) => ({ default: m.World })))

const webgl = (() => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
})()

function useRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash.startsWith('#/classic') ? 'classic' : 'world'
}

function Explore() {
  const started = useStore((s) => s.started)
  const sound = useStore((s) => s.sound)
  const night = useStore((s) => s.night)
  useKeyboard()
  useEffect(() => {
    if (sound) startAmbient({ night })
    else stopAmbient()
  }, [sound, night])
  return (
    <div className="app">
      <Suspense fallback={null}>
        <World />
      </Suspense>
      {started ? (
        <>
          <HUD />
          <Panel />
        </>
      ) : (
        <Intro />
      )}
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
  return <Explore />
}

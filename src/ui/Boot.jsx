import { useEffect, useMemo, useState } from 'react'
import { useStore, isTouch } from '../store'
import { profile } from '../content'

const TIPS = [
  'Every building on the island is a piece of the portfolio.',
  'Press M to open the map and fast-travel.',
  'Some secrets are hidden up high… and some behind the trees.',
  'Hold Shift (or push the joystick fully) to run.',
  'Talk to the locals: they know things.',
  'The island follows your real clock. Come back at night!',
  'Plants in the Skill Garden grow taller with more practice.',
]

/** Loading screen with a progress bar and rotating tips. */
export function LoadingScreen({ worldLoaded }) {
  const ready = useStore((s) => s.ready)
  const [progress, setProgress] = useState(0)
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length))
  const target = ready ? 100 : worldLoaded ? 82 : 55
  const stage = ready ? 'Ready!' : worldLoaded ? 'Planting the grass…' : 'Unpacking the island…'

  useEffect(() => {
    const id = setInterval(() => setProgress((p) => Math.min(target, p + Math.max(0.6, (target - p) * 0.08))), 30)
    return () => clearInterval(id)
  }, [target])
  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 3200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={`boot loading ${progress >= 100 ? 'done' : ''}`}>
      <div className="boot-inner">
        <div className="loader-island" aria-hidden>
          🏝️
        </div>
        <h1 className="logo small">{profile.name}'s World</h1>
        <div className="progress">
          <div style={{ width: `${progress}%` }} />
        </div>
        <p className="stage">
          {stage} <span>{Math.round(progress)}%</span>
        </p>
        <p className="tip" key={tip}>
          💡 {TIPS[tip]}
        </p>
      </div>
    </div>
  )
}

/** Title screen over a slow fly-around of the island. */
export function TitleScreen() {
  const letters = useMemo(() => `${profile.name}'s`.split(''), [])
  return (
    <div className="boot title" onClick={() => window.dispatchEvent(new Event('game-start'))}>
      <div className="title-inner" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow light">A tiny interactive portfolio</p>
        <h1 className="logo">
          <span className="logo-top">
            {letters.map((l, i) => (
              <span key={i} style={{ animationDelay: `${i * 0.05}s` }}>
                {l}
              </span>
            ))}
          </span>
          <span className="logo-bottom">World</span>
        </h1>
        <p className="title-tag">{profile.tagline}</p>
        <div className="title-actions">
          <button className="btn big" onClick={() => window.dispatchEvent(new Event('game-start'))} autoFocus>
            ▶ Start exploring
          </button>
          <button className="btn ghost light" onClick={() => window.dispatchEvent(new CustomEvent('game-start', { detail: { tour: true } }))}>
            🧭 Guided tour
          </button>
          <a className="btn ghost light" href="#/classic">
            Classic site
          </a>
        </div>
        <p className="press-start">{isTouch ? 'Tap anywhere to start' : 'Press any key to start'}</p>
      </div>
      <p className="title-foot">
        {isTouch ? 'Joystick to walk · ✋ to interact' : 'WASD to walk · Shift to run · Space to jump · E to interact · M for map'} · 🎧
        sound on
      </p>
    </div>
  )
}

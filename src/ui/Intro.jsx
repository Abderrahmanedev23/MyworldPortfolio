import { useStore, isTouch } from '../store'
import { profile } from '../content'

export function Intro() {
  const ready = useStore((s) => s.ready)
  const start = useStore((s) => s.start)
  return (
    <div className="intro">
      <div className="intro-card">
        <p className="eyebrow">Welcome to</p>
        <h1>{profile.name}'s World</h1>
        <p className="lead">{profile.tagline}</p>
        <p className="controls">
          {isTouch
            ? 'Joystick to walk · ✋ to interact · drag to look around'
            : 'WASD / arrows to walk · Shift to run · Space to jump · E to interact'}
        </p>
        <button className="btn big" disabled={!ready} onClick={start} autoFocus>
          {ready ? 'Explore the island →' : 'Building the island…'}
        </button>
        <a className="skip" href="#/classic">
          or skip to the classic site
        </a>
      </div>
    </div>
  )
}

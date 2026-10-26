import { useEffect, useRef, useState } from 'react'
import { isTouch, useStore } from '../store'
import { profile, secrets } from '../content'
import { AREAS } from '../world/layout'
import { back, toggleMap } from '../input'
import { audio } from '../audio'
import { Minimap } from './Minimap'
import { TouchControls } from './Joystick'
import { CatchCard, FishingHint } from './Fishing'

const QUESTS = [
  ['about', 'Visit the Cozy House', '🏠'],
  ['projects', 'Check out the Workshop', '🔧'],
  ['skills', 'Walk the Skill Garden', '🌱'],
  ['experience', 'Stroll down Memory Lane', '🪧'],
  ['contact', 'Find the mailbox', '📡'],
]

function PlayerCard() {
  const initials = profile.name.slice(0, 1).toUpperCase()
  return (
    <div className="player-card">
      <div className="avatar-badge" style={{ background: profile.avatar.hoodie }}>
        {initials}
      </div>
      <div>
        <b>{profile.name}</b>
        <span>{profile.role}</span>
      </div>
    </div>
  )
}

function QuestTracker() {
  const visited = useStore((s) => s.visited)
  const achievements = useStore((s) => s.achievements)
  const [open, setOpen] = useState(!isTouch)
  const done = visited.length
  return (
    <div className={`quests ${open ? 'open' : ''}`}>
      <button className="quests-head" onClick={() => setOpen(!open)}>
        <span>📜 Explore the island</span>
        <b>{done}/5</b>
      </button>
      {open && (
        <ul>
          {QUESTS.map(([id, label, icon]) => (
            <li key={id} className={visited.includes(id) ? 'done' : ''}>
              <span className="check">{visited.includes(id) ? '✓' : icon}</span>
              {label}
            </li>
          ))}
          <li className="secrets-line">
            <span className="check">★</span>
            Secrets found
            <b>
              {achievements.length}/{secrets.length}
            </b>
          </li>
        </ul>
      )}
    </div>
  )
}

function ZoneTitle() {
  const area = useStore((s) => s.area)
  const [shown, setShown] = useState(null)
  const last = useRef(null)
  useEffect(() => {
    if (!area || area === last.current) return
    last.current = area
    const a = AREAS.find((x) => x.id === area)
    setShown({ ...a, key: Date.now() })
    const t = setTimeout(() => setShown(null), 3200)
    return () => clearTimeout(t)
  }, [area])
  if (!shown) return null
  return (
    <div className="zone-title" key={shown.key}>
      <span className="zone-icon">{shown.icon}</span>
      <h2>{shown.name}</h2>
      <p>
        <i />
        {shown.sub}
        <i />
      </p>
    </div>
  )
}

const WEATHER = {
  clear: ['☀️', 'Sunny'],
  rain: ['🌧️', 'Rainy · rare fish bite'],
  blossom: ['🌸', 'Blossom breeze'],
}

function WeatherChip() {
  const weather = useStore((s) => s.weather)
  const night = useStore((s) => s.night)
  const rainbow = useStore((s) => s.rainbow)
  const [icon, label] = weather === 'clear' && night ? ['🌙', 'Clear night'] : rainbow && weather === 'clear' ? ['🌈', 'Rainbow!'] : WEATHER[weather]
  return (
    <div className="weather-chip" key={weather + rainbow}>
      <span>{icon}</span> {label}
    </div>
  )
}

function Toast() {
  const toast = useStore((s) => s.toast)
  const hideToast = useStore((s) => s.hideToast)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(hideToast, 5000)
    return () => clearTimeout(t)
  }, [toast, hideToast])
  if (!toast) return null
  return (
    <div className={`toast ${toast.kind ?? ''}`} key={toast.key} onClick={hideToast}>
      <span className="toast-icon">{toast.icon}</span>
      <div>
        <small>{toast.kind === 'achievement' ? 'Secret found!' : toast.title}</small>
        {toast.kind === 'achievement' && <b>{toast.title}</b>}
        <p>{toast.text}</p>
      </div>
    </div>
  )
}

function BoatHint() {
  const boating = useStore((s) => s.boating)
  if (!boating) return null
  return (
    <div className="fish-hint">
      ⛵ {isTouch ? 'Joystick up/down to row, left/right to steer · ✋ to get out' : 'W / S row · A / D steer · E get out near land'}
    </div>
  )
}

export function HUD() {
  const settings = useStore((s) => s.settings)
  const setSetting = useStore((s) => s.setSetting)
  const busy = useStore((s) => !!s.panel || !!s.dialogue)
  const [hint, setHint] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setHint(false), 14000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`hud ${busy ? 'dim' : ''}`}>
      <div className="hud-left">
        <PlayerCard />
        <QuestTracker />
      </div>
      <div className="hud-right">
        <Minimap />
        <div className="hud-buttons">
          <button className="icon-btn" onClick={toggleMap} title="Map (M)">
            🗺
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              setSetting('muted', !settings.muted)
              audio.play('click')
            }}
            title="Sound"
          >
            {settings.muted ? '🔇' : '🔊'}
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              audio.play('open')
              useStore.getState().setPhoto(true)
            }}
            title="Photo mode (C)"
          >
            📷
          </button>
          <button className="icon-btn" onClick={back} title="Pause (Esc)">
            ⏸
          </button>
        </div>
        <WeatherChip />
        <a className="classic-link" href="#/classic">
          Classic site →
        </a>
      </div>
      <ZoneTitle />
      {hint && !isTouch && (
        <div className="hint">
          <kbd>WASD</kbd> walk <kbd>Shift</kbd> run <kbd>Space</kbd> jump <kbd>E</kbd> interact <kbd>M</kbd> map <kbd>C</kbd> photo{' '}
          <kbd>Esc</kbd> pause
        </div>
      )}
      {isTouch && <TouchControls />}
      <FishingHint />
      <BoatHint />
      <CatchCard />
      <Toast />
    </div>
  )
}

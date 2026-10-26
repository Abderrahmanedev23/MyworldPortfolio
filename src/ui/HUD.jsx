import { useEffect, useState } from 'react'
import { useStore, isTouch } from '../store'
import { profile, secrets } from '../content'
import { TouchControls } from './Joystick'

function Toast() {
  const toast = useStore((s) => s.toast)
  const hideToast = useStore((s) => s.hideToast)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(hideToast, 4500)
    return () => clearTimeout(t)
  }, [toast, hideToast])
  if (!toast) return null
  return (
    <div className="toast" key={toast.key} onClick={hideToast}>
      <span className="toast-icon">{toast.icon}</span>
      <div>
        <b>{toast.title}</b>
        <p>{toast.text}</p>
      </div>
    </div>
  )
}

function Secrets() {
  const achievements = useStore((s) => s.achievements)
  const [open, setOpen] = useState(false)
  return (
    <div className="secrets">
      <button className="chip" onClick={() => setOpen(!open)} title="Secrets found">
        ★ {achievements.length}/{secrets.length}
      </button>
      {open && (
        <ul className="secrets-list">
          {secrets.map((s) => (
            <li key={s.id} className={achievements.includes(s.id) ? 'got' : ''}>
              {achievements.includes(s.id) ? `★ ${s.title}` : '☆ ???'}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function HUD() {
  const sound = useStore((s) => s.sound)
  const setSound = useStore((s) => s.setSound)
  const quality = useStore((s) => s.quality)
  const setQuality = useStore((s) => s.setQuality)
  const [hint, setHint] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setHint(false), 12000)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <header className="hud-top">
        <div className="badge">
          <b>{profile.name}</b>
          <span>{profile.role}</span>
        </div>
        <div className="hud-actions">
          <Secrets />
          <button className="chip" onClick={() => setSound(!sound)} title="Ambient sound">
            {sound ? '🔊' : '🔈'}
          </button>
          <button className="chip" onClick={() => setQuality(quality === 'high' ? 'low' : 'high')} title="Graphics quality">
            {quality === 'high' ? 'HD' : 'SD'}
          </button>
          <a className="chip primary" href="#/classic">
            Classic site
          </a>
        </div>
      </header>
      {hint && !isTouch && (
        <div className="hint">
          <kbd>WASD</kbd> walk · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump · <kbd>E</kbd> interact · drag to look
        </div>
      )}
      {isTouch && <TouchControls />}
      <Toast />
    </>
  )
}

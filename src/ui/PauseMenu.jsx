import { useState } from 'react'
import { useStore } from '../store'
import { audio } from '../audio'
import { secrets } from '../content'

function Segmented({ value, options, onChange }) {
  return (
    <div className="segmented">
      {options.map(([v, label]) => (
        <button
          key={v}
          className={v === value ? 'on' : ''}
          onClick={() => {
            audio.play('click')
            onChange(v)
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Slider({ value, onChange, min = 0, max = 1, step = 0.05 }) {
  return (
    <input
      type="range"
      className="slider"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ '--fill': `${((value - min) / (max - min)) * 100}%` }}
    />
  )
}

export function Settings() {
  const settings = useStore((s) => s.settings)
  const set = useStore((s) => s.setSetting)
  return (
    <div className="settings">
      <label>
        <span>Graphics</span>
        <Segmented
          value={settings.quality}
          options={[
            ['low', 'Low'],
            ['medium', 'Medium'],
            ['high', 'High'],
          ]}
          onChange={(v) => set('quality', v)}
        />
      </label>
      <label>
        <span>Music</span>
        <Slider value={settings.music} onChange={(v) => set('music', v)} />
      </label>
      <label>
        <span>Sound effects</span>
        <Slider value={settings.sfx} onChange={(v) => set('sfx', v)} />
      </label>
      <label>
        <span>Mute everything</span>
        <Segmented
          value={settings.muted}
          options={[
            [false, 'Off'],
            [true, 'On'],
          ]}
          onChange={(v) => set('muted', v)}
        />
      </label>
      <label>
        <span>Camera sensitivity</span>
        <Slider value={settings.sensitivity} min={0.3} max={2} step={0.1} onChange={(v) => set('sensitivity', v)} />
      </label>
    </div>
  )
}

const CONTROLS = [
  ['Move', 'WASD / ZQSD / Arrows', 'Left stick', 'Joystick'],
  ['Run', 'Shift', 'RB / RT', 'Push joystick fully'],
  ['Jump', 'Space', 'A', '⤒ button'],
  ['Interact / Talk', 'E / Enter', 'X or B', '✋ button'],
  ['Wave', 'R', 'Y', '—'],
  ['Camera', 'Drag mouse · Wheel', 'Right stick', 'Drag · Pinch'],
  ['Map', 'M', 'View / Select', '🗺 button'],
  ['Pause', 'Esc / P', 'Start', '⏸ button'],
]

export function PauseMenu() {
  const setMenu = useStore((s) => s.setMenu)
  const achievements = useStore((s) => s.achievements)
  const visited = useStore((s) => s.visited)
  const resetProgress = useStore((s) => s.resetProgress)
  const [tab, setTab] = useState('home')
  const [confirm, setConfirm] = useState(false)
  const go = (t) => {
    audio.play('click')
    setTab(t)
  }
  return (
    <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && setMenu(null)}>
      <div className="menu-card">
        {tab === 'home' && (
          <>
            <p className="eyebrow">Paused</p>
            <h2>Take a breather ☕</h2>
            <div className="menu-stats">
              <div>
                <b>{visited.length}/5</b>
                <span>places explored</span>
              </div>
              <div>
                <b>
                  {achievements.length}/{secrets.length}
                </b>
                <span>secrets found</span>
              </div>
            </div>
            <nav className="menu-list">
              <button className="menu-item primary" onClick={() => setMenu(null)}>
                ▶ Resume
              </button>
              <button className="menu-item" onClick={() => setMenu('map')}>
                🗺 Map & fast travel
              </button>
              <button className="menu-item" onClick={() => go('settings')}>
                ⚙ Settings
              </button>
              <button className="menu-item" onClick={() => go('controls')}>
                🎮 Controls
              </button>
              <a className="menu-item" href="#/classic">
                📄 Classic site
              </a>
              {confirm ? (
                <button
                  className="menu-item danger"
                  onClick={() => {
                    resetProgress()
                    setConfirm(false)
                    audio.play('close')
                  }}
                >
                  Sure? Click again to reset
                </button>
              ) : (
                <button className="menu-item subtle" onClick={() => setConfirm(true)}>
                  ↺ Reset progress
                </button>
              )}
            </nav>
          </>
        )}
        {tab === 'settings' && (
          <>
            <button className="back-link" onClick={() => go('home')}>
              ← Back
            </button>
            <h2>Settings</h2>
            <Settings />
          </>
        )}
        {tab === 'controls' && (
          <>
            <button className="back-link" onClick={() => go('home')}>
              ← Back
            </button>
            <h2>Controls</h2>
            <div className="controls-table">
              <div className="row head">
                <span />
                <span>Keyboard</span>
                <span>Gamepad</span>
                <span>Touch</span>
              </div>
              {CONTROLS.map(([action, ...ways]) => (
                <div key={action} className="row">
                  <b>{action}</b>
                  {ways.map((w, i) => (
                    <span key={i}>{w}</span>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

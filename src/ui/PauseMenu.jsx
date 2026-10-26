import { useState } from 'react'
import { useStore } from '../store'
import { audio } from '../audio'
import { fish, secrets } from '../content'
import { Collection } from './Fishing'

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
  ['Interact / Talk / Fish', 'E / Enter', 'X or B', '✋ button'],
  ['Wave', 'R', 'Y', '—'],
  ['Camera', 'Drag mouse · Wheel', 'Right stick', 'Drag · Pinch'],
  ['Map', 'M', 'View / Select', '🗺 button'],
  ['Pause', 'Esc / P', 'Start', '⏸ button'],
]

export function PauseMenu() {
  const setMenu = useStore((s) => s.setMenu)
  const achievements = useStore((s) => s.achievements)
  const visited = useStore((s) => s.visited)
  const collection = useStore((s) => s.collection)
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
            <div className="menu-stats three">
              <div>
                <b>{visited.length}/5</b>
                <span>places</span>
              </div>
              <div>
                <b>
                  {achievements.length}/{secrets.length}
                </b>
                <span>secrets</span>
              </div>
              <div>
                <b>
                  {Object.keys(collection).length}/{fish.length}
                </b>
                <span>fish</span>
              </div>
            </div>
            <nav className="menu-list">
              <button className="menu-item primary" onClick={() => setMenu(null)}>
                ▶ Resume
              </button>
              <button className="menu-item" onClick={() => setMenu('map')}>
                🗺 Map & fast travel
              </button>
              <button className="menu-item" onClick={() => go('fish')}>
                🐟 Fish collection
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
              <button className="menu-item" onClick={() => go('credits')}>
                ❤ Credits
              </button>
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
        {tab === 'fish' && (
          <>
            <button className="back-link" onClick={() => go('home')}>
              ← Back
            </button>
            <h2>Fish collection</h2>
            <Collection />
          </>
        )}
        {tab === 'credits' && (
          <>
            <button className="back-link" onClick={() => go('home')}>
              ← Back
            </button>
            <h2>Credits</h2>
            <ul className="credits">
              <li>
                Characters: <b>KayKit Character Pack: Adventurers</b> by Kay Lousberg (CC0) —{' '}
                <a href="https://kaylousberg.itch.io/kaykit-adventurers" target="_blank" rel="noreferrer">
                  kaylousberg.itch.io
                </a>
              </li>
              <li>
                Fox: <b>Low poly fox</b> by PixelMannen &amp; tomkranis, rigged by AsoboStudio &amp; scurest (CC-BY 4.0) —{' '}
                <a href="https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox" target="_blank" rel="noreferrer">
                  glTF Sample Assets
                </a>
              </li>
              <li>Everything else (island, shaders, music, sounds) is generated in code.</li>
              <li>
                Built with React Three Fiber, Rapier, Drei and postprocessing. Fonts: Fredoka &amp; Nunito.
              </li>
            </ul>
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

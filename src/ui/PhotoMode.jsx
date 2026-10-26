import { useState } from 'react'
import { playerState, useStore } from '../store'
import { audio } from '../audio'
import { profile } from '../content'
import { glRef } from '../world/glRef'

const FILTERS = [
  ['none', 'Natural', 'none'],
  ['warm', 'Golden', 'sepia(0.25) saturate(1.25) brightness(1.05) hue-rotate(-8deg)'],
  ['dreamy', 'Dreamy', 'saturate(1.15) brightness(1.1) contrast(0.92) blur(0.4px)'],
  ['vintage', 'Vintage', 'sepia(0.55) contrast(1.05) brightness(0.98) saturate(0.85)'],
  ['mono', 'B & W', 'grayscale(1) contrast(1.15)'],
  ['pop', 'Pop', 'saturate(1.6) contrast(1.1)'],
]
const POSES = [
  ['idle', '🧍', 'Stand'],
  ['wave', '🙌', 'Cheer'],
  ['sitFloor', '🧘', 'Sit'],
  ['run', '🏃', 'Run'],
  ['cast', '🎣', 'Cast'],
]

export function PhotoMode() {
  const setPhoto = useStore((s) => s.setPhoto)
  const [filter, setFilter] = useState('none')
  const [frame, setFrame] = useState(true)
  const [pose, setPose] = useState('idle')
  const [flash, setFlash] = useState(0)
  const css = FILTERS.find((f) => f[0] === filter)[2]

  const choosePose = (p) => {
    setPose(p)
    playerState.photoPose = p
    audio.play('click')
  }

  const snap = () => {
    const src = glRef.current?.domElement
    if (!src) return
    audio.play('shutter')
    setFlash(Date.now())
    const pad = frame ? Math.round(src.width * 0.04) : 0
    const bottom = frame ? Math.round(src.width * 0.11) : 0
    const out = document.createElement('canvas')
    out.width = src.width + pad * 2
    out.height = src.height + pad + bottom
    const ctx = out.getContext('2d')
    if (frame) {
      ctx.fillStyle = '#fffdf8'
      ctx.fillRect(0, 0, out.width, out.height)
    }
    ctx.filter = css
    ctx.drawImage(src, pad, pad)
    ctx.filter = 'none'
    if (frame) {
      ctx.fillStyle = '#2a2236'
      ctx.textBaseline = 'middle'
      ctx.font = `600 ${Math.round(bottom * 0.32)}px Fredoka, system-ui, sans-serif`
      ctx.fillText(`${profile.name}'s World`, pad, src.height + pad + bottom / 2)
      ctx.fillStyle = '#7a7388'
      ctx.textAlign = 'right'
      ctx.font = `600 ${Math.round(bottom * 0.2)}px Nunito, system-ui, sans-serif`
      ctx.fillText(new Date().toLocaleDateString(), out.width - pad, src.height + pad + bottom / 2)
    }
    out.toBlob((blob) => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `my-world-${Date.now()}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    }, 'image/png')
  }

  const exit = () => {
    playerState.photoPose = null
    audio.play('close')
    setPhoto(false)
  }

  return (
    <div className="photo">
      <style>{`.app canvas { filter: ${css}; }`}</style>
      {frame && <div className="photo-frame" />}
      {flash > 0 && <div className="photo-flash" key={flash} />}
      <div className="photo-top">
        <span className="photo-badge">📷 Photo mode</span>
        <span className="photo-help">Drag to orbit · scroll / pinch to zoom</span>
        <button className="icon-btn" onClick={exit} aria-label="Exit photo mode">
          ✕
        </button>
      </div>
      <div className="photo-bar">
        <div className="photo-group">
          {FILTERS.map(([id, label]) => (
            <button key={id} className={`chip-btn ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="photo-group">
          <button
            className="chip-btn on mobile-only"
            onClick={() => setFilter(FILTERS[(FILTERS.findIndex((f) => f[0] === filter) + 1) % FILTERS.length][0])}
          >
            🎨 {FILTERS.find((f) => f[0] === filter)[1]}
          </button>
          {POSES.map(([id, icon, label]) => (
            <button key={id} className={`chip-btn ${pose === id ? 'on' : ''}`} onClick={() => choosePose(id)} title={label}>
              {icon} <span>{label}</span>
            </button>
          ))}
          <button className={`chip-btn ${frame ? 'on' : ''}`} onClick={() => setFrame(!frame)}>
            🖼 Frame
          </button>
        </div>
        <button className="snap" onClick={snap} aria-label="Take photo">
          <span />
        </button>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { input } from '../input'
import { playerState, useStore } from '../store'
import { audio } from '../audio'
import { AREAS } from '../world/layout'
import { drawIsland, drawPlayer, makeProjector } from './mapDraw'

export function fastTravel(area) {
  const { setMenu, setFade } = useStore.getState()
  setMenu(null)
  setFade(true)
  audio.play('whoosh')
  setTimeout(() => {
    const [sx, sz] = area.spawn
    playerState.teleport = [sx, 1.6, sz]
    // look towards the area from the arrival point
    const fx = area.pos[0] - sx
    const fz = area.pos[1] - sz
    if (Math.hypot(fx, fz) > 0.1) input.cameraYaw = Math.atan2(-fx, -fz)
    playerState.facing = Math.atan2(fx, fz)
    setTimeout(() => setFade(false), 250)
  }, 380)
}

/** Full-screen island map. Click an area to fast-travel there. */
export function MapScreen() {
  const canvas = useRef()
  const wrap = useRef()
  const [size, setSize] = useState(400)
  const achievements = useStore((s) => s.achievements)
  const night = useStore((s) => s.night)
  const setMenu = useStore((s) => s.setMenu)

  useEffect(() => {
    const fit = () => setSize(Math.min(wrap.current.clientWidth, wrap.current.clientHeight, 640))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const scale = size / 78
  const view = { cx: 0, cz: 0, scale, yaw: 0, w: size, h: size }
  const project = makeProjector(view)

  useEffect(() => {
    const ctx = canvas.current.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.current.width = size * dpr
    canvas.current.height = size * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    let raf
    const draw = () => {
      const proj = drawIsland(ctx, { cx: 0, cz: 0, scale: size / 78, yaw: 0, w: size, h: size }, { achievements, night, icons: false })
      const [x, y] = proj(playerState.position.x, playerState.position.z)
      drawPlayer(ctx, x, y, playerState.facing, 0, 11)
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [size, achievements, night])

  return (
    <div className="overlay map-overlay" onPointerDown={(e) => e.target === e.currentTarget && setMenu(null)}>
      <div className="map-card">
        <header className="map-head">
          <div>
            <p className="eyebrow">Island map</p>
            <h2>Where to?</h2>
          </div>
          <button className="icon-btn" onClick={() => setMenu(null)} aria-label="Close map">
            ✕
          </button>
        </header>
        <div className="map-body" ref={wrap}>
          <div className="map-canvas" style={{ width: size, height: size }}>
            <canvas ref={canvas} style={{ width: size, height: size }} />
            {AREAS.filter((a) => !a.secret || achievements.includes(a.secret)).map((a) => {
              const [x, y] = project(a.pos[0], a.pos[1])
              return (
                <button key={a.id} className="map-pin" style={{ left: x, top: y }} onClick={() => fastTravel(a)}>
                  <span className="map-pin-icon">{a.icon}</span>
                  <span className="map-pin-label">
                    <b>{a.name}</b>
                    <small>{a.sub}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <p className="map-foot">Tap a place to fast-travel · M / Esc to close</p>
      </div>
    </div>
  )
}

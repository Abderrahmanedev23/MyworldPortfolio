import { useEffect, useRef } from 'react'
import { input, toggleMap } from '../input'
import { playerState, useStore } from '../store'
import { drawIsland, drawPlayer } from './mapDraw'

const SIZE = 150

/** Round minimap that turns with the camera (forward is always up), with a compass. */
export function Minimap() {
  const canvas = useRef()
  const north = useRef()
  useEffect(() => {
    const ctx = canvas.current.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.current.width = SIZE * dpr
    canvas.current.height = SIZE * dpr
    ctx.scale(dpr, dpr)
    let raf
    const draw = () => {
      const { achievements, night } = useStore.getState()
      const p = playerState.position
      const yaw = input.cameraYaw
      drawIsland(ctx, { cx: p.x, cz: p.z, scale: 3, yaw, w: SIZE, h: SIZE }, { achievements, night })
      drawPlayer(ctx, SIZE / 2, SIZE / 2, playerState.facing, yaw)
      // compass "N" sits on the rim, pointing at world north (-z)
      const r = SIZE / 2 - 11
      north.current.style.transform = `translate(${Math.sin(yaw) * r}px, ${-Math.cos(yaw) * r}px)`
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <button className="minimap" onClick={toggleMap} title="Open map (M)">
      <canvas ref={canvas} style={{ width: SIZE, height: SIZE }} />
      <span ref={north} className="compass-n">
        N
      </span>
      <span className="minimap-key">M</span>
    </button>
  )
}

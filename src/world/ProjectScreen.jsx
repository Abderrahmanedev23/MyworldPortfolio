import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, TextureLoader } from 'three'
import { profile } from '../content'

const W = 512
const H = 1024 // a tall "page"; the screen shows a window of it and scrolls like someone is browsing

function wrap(ctx, text, x, y, maxW, lineH, maxLines = 4) {
  const words = String(text).split(' ')
  let line = ''
  let n = 0
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + n * lineH)
      line = w
      if (++n >= maxLines) return y + n * lineH
    } else line = test
  }
  ctx.fillText(line, x, y + n * lineH)
  return y + (n + 1) * lineH
}

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

/** Paint a little mock website for a project onto a canvas. */
function paintPage(p) {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const font = (w, s) => `${w} ${s}px system-ui, -apple-system, Segoe UI, sans-serif`
  // page background + hero gradient
  ctx.fillStyle = '#f7f5f0'
  ctx.fillRect(0, 0, W, H)
  const g = ctx.createLinearGradient(0, 0, W, 360)
  g.addColorStop(0, p.color)
  g.addColorStop(1, '#2a2236')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, 380)
  // browser chrome
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(0, 0, W, 40)
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(22 + i * 22, 20, 7, 0, Math.PI * 2)
    ctx.fill()
  })
  roundRect(ctx, 96, 9, W - 120, 22, 11, 'rgba(255,255,255,0.85)')
  ctx.fillStyle = '#555'
  ctx.font = font(500, 13)
  ctx.fillText(`🔒 ${profile.name.toLowerCase()}.dev/${p.id}`, 110, 25)
  // hero
  ctx.fillStyle = '#fff'
  ctx.font = font(800, 44)
  const yTitle = wrap(ctx, p.title, 32, 120, W - 64, 50, 2)
  ctx.font = font(500, 20)
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  wrap(ctx, p.summary, 32, yTitle + 14, W - 64, 28, 3)
  roundRect(ctx, 32, 300, 150, 44, 22, '#ffffff')
  ctx.fillStyle = p.color
  ctx.font = font(700, 17)
  ctx.fillText('View project →', 46, 328)
  // tags
  let x = 32
  ctx.font = font(700, 16)
  for (const t of p.tags) {
    const w = ctx.measureText(t).width + 24
    roundRect(ctx, x, 410, w, 32, 16, '#ece8ff')
    ctx.fillStyle = '#4a4458'
    ctx.fillText(t, x + 12, 432)
    x += w + 8
  }
  // "content": description + cards + a tiny chart
  ctx.fillStyle = '#2a2236'
  ctx.font = font(800, 26)
  ctx.fillText('About this project', 32, 500)
  ctx.font = font(400, 18)
  ctx.fillStyle = '#5c566a'
  const yDesc = wrap(ctx, p.description, 32, 534, W - 64, 26, 5)
  for (let i = 0; i < 3; i++) {
    const cx = 32 + i * 155
    roundRect(ctx, cx, yDesc + 20, 140, 120, 16, '#ffffff')
    roundRect(ctx, cx + 16, yDesc + 38, 40, 40, 12, p.color)
    roundRect(ctx, cx + 16, yDesc + 92, 100, 10, 5, '#e3ded4')
    roundRect(ctx, cx + 16, yDesc + 110, 70, 10, 5, '#ece8e0')
  }
  const chartY = yDesc + 170
  roundRect(ctx, 32, chartY, W - 64, 170, 16, '#ffffff')
  for (let i = 0; i < 9; i++) {
    const h = 30 + ((Math.sin(i * 1.7 + p.title.length) + 1) / 2) * 100
    roundRect(ctx, 56 + i * 48, chartY + 150 - h, 30, h, 8, i % 2 ? p.color : '#c9c2ff')
  }
  // footer
  ctx.fillStyle = '#2a2236'
  ctx.fillRect(0, H - 60, W, 60)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = font(600, 15)
  ctx.fillText(`© ${profile.name} · built with ♥`, 32, H - 25)
  return c
}

/**
 * The booth's screen: a scrolling mock website for the project,
 * or the project's own image when `image` is set in projects.json.
 */
export function ProjectScreen({ project, width, height, index }) {
  const mat = useRef()
  const [photo, setPhoto] = useState(null)
  // show a window of the page with the same aspect ratio as the screen
  const visible = (W * height) / width / H
  const page = useMemo(() => {
    const t = new CanvasTexture(paintPage(project))
    t.colorSpace = SRGBColorSpace
    t.wrapT = RepeatWrapping
    t.repeat.set(1, visible)
    t.offset.y = 1 - visible
    t.anisotropy = 4
    return t
  }, [project, visible])
  useEffect(() => {
    if (!project.image) return
    let alive = true
    new TextureLoader().setCrossOrigin('anonymous').load(
      project.image,
      (t) => {
        t.colorSpace = SRGBColorSpace
        if (alive) setPhoto(t)
      },
      undefined,
      () => {}, // keep the mock page if the image can't load
    )
    return () => {
      alive = false
    }
  }, [project.image])
  useEffect(() => () => page.dispose(), [page])

  useFrame(({ clock }) => {
    if (photo) return
    // scroll down the page, pause, scroll back up — like someone browsing
    const t = (clock.elapsedTime * 0.08 + index * 0.37) % 2
    const k = t < 1 ? Math.min(1, Math.max(0, (t - 0.2) / 0.6)) : Math.min(1, Math.max(0, (2 - t - 0.2) / 0.6))
    page.offset.y = (1 - visible) * (1 - k)
  })

  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial ref={mat} map={photo ?? page} color="#e8e8e8" toneMapped={false} />
    </mesh>
  )
}

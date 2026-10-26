import { useEffect, useMemo } from 'react'
import { Billboard } from '@react-three/drei'
import { CanvasTexture, SRGBColorSpace } from 'three'

// Text rendered to a canvas texture: no font files to download, works offline.
function makeTexture(text, { color, background, font, padding }) {
  const lines = String(text).split('\n')
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const px = 64
  ctx.font = `${font} ${px}px system-ui, -apple-system, Segoe UI, sans-serif`
  const width = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2
  const lineH = px * 1.2
  canvas.width = Math.ceil(width)
  canvas.height = Math.ceil(lines.length * lineH + padding * 1.2)
  ctx.font = `${font} ${px}px system-ui, -apple-system, Segoe UI, sans-serif`
  if (background) {
    ctx.fillStyle = background
    const r = Math.min(40, canvas.height / 2)
    ctx.beginPath()
    ctx.roundRect(0, 0, canvas.width, canvas.height, r)
    ctx.fill()
  }
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((l, i) => ctx.fillText(l, canvas.width / 2, padding * 0.6 + lineH * (i + 0.5)))
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return { tex, aspect: canvas.width / canvas.height }
}

export function Label({
  text,
  size = 0.5, // world height
  color = '#ffffff',
  background = 'rgba(20,24,40,0.55)',
  font = '700',
  padding = 28,
  billboard = false,
  ...props
}) {
  const { tex, aspect } = useMemo(
    () => makeTexture(text, { color, background, font, padding }),
    [text, color, background, font, padding],
  )
  useEffect(() => () => tex.dispose(), [tex])
  const mesh = (
    <mesh>
      <planeGeometry args={[size * aspect, size]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
  return billboard ? (
    <Billboard {...props}>{mesh}</Billboard>
  ) : (
    <group {...props}>{mesh}</group>
  )
}

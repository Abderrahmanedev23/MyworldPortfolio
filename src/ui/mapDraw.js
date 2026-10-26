import { AREAS, GRASS_RADIUS, ISLAND_RADIUS, PATHS, ZONES, faceCenter } from '../world/layout'

/**
 * Draw the island onto a 2D canvas.
 * view: { cx, cy (world centre), scale (px per metre), yaw (camera yaw; 0 = north up) }
 */
export function makeProjector({ cx, cz, scale, yaw, w, h }) {
  const s = Math.sin(yaw)
  const c = Math.cos(yaw)
  return (x, z) => {
    const dx = x - cx
    const dz = z - cz
    const f = -dx * s - dz * c // along camera forward
    const r = dx * c - dz * s // along camera right
    return [w / 2 + r * scale, h / 2 - f * scale]
  }
}

function rotatedRect(ctx, project, [ox, oz], rot, hw, hd) {
  const corners = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([lx, lz]) => project(ox + lx * Math.cos(rot) + lz * Math.sin(rot), oz - lx * Math.sin(rot) + lz * Math.cos(rot)))
  ctx.beginPath()
  corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}

export function drawIsland(ctx, view, { achievements = [], icons = true, night = false } = {}) {
  const { w, h, scale } = view
  const project = makeProjector(view)
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = night ? '#1f3d66' : '#5cc6d8'
  ctx.fillRect(0, 0, w, h)

  const [ix, iy] = project(0, 0)
  // shallow water ring, sand, grass
  ctx.fillStyle = night ? '#2e5b84' : '#8fe0e0'
  ctx.beginPath()
  ctx.arc(ix, iy, (ISLAND_RADIUS + 4) * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = night ? '#b9a77c' : '#f3dca6'
  ctx.beginPath()
  ctx.arc(ix, iy, ISLAND_RADIUS * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = night ? '#4e7f45' : '#86c96a'
  ctx.beginPath()
  ctx.arc(ix, iy, GRASS_RADIUS * scale, 0, Math.PI * 2)
  ctx.fill()

  // paths
  ctx.strokeStyle = night ? '#a99a74' : '#ecd8a8'
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(2, 1.9 * scale)
  for (const [a, b] of PATHS) {
    const [x1, y1] = project(a[0], a[1])
    const [x2, y2] = project(b[0], b[1])
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
  ctx.fillStyle = ctx.strokeStyle
  ctx.beginPath()
  ctx.arc(ix, iy, 5.7 * scale, 0, Math.PI * 2)
  ctx.fill()

  // dock
  const [d1x, d1y] = project(28, 0)
  const [d2x, d2y] = project(37, 0)
  ctx.strokeStyle = '#a86f39'
  ctx.lineWidth = Math.max(3, 2 * scale)
  ctx.lineCap = 'butt'
  ctx.beginPath()
  ctx.moveTo(d1x, d1y)
  ctx.lineTo(d2x, d2y)
  ctx.stroke()

  // buildings
  ctx.fillStyle = '#e05a47'
  rotatedRect(ctx, project, ZONES.house, faceCenter(ZONES.house), 3.5, 3)
  ctx.fill()
  ctx.fillStyle = '#7d9cd6'
  rotatedRect(ctx, project, ZONES.workshop, faceCenter(ZONES.workshop), 4, 3)
  ctx.fill()
  ctx.fillStyle = '#8d6e4f'
  rotatedRect(ctx, project, ZONES.garden, faceCenter(ZONES.garden), 3.1, 3.1)
  ctx.fill()
  ctx.fillStyle = '#d62828'
  ctx.beginPath()
  ctx.arc(...project(ZONES.tower[0], ZONES.tower[1]), Math.max(2, 1.2 * scale), 0, Math.PI * 2)
  ctx.fill()

  if (!icons) return project
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${Math.max(12, Math.min(26, scale * 2.6))}px system-ui, sans-serif`
  for (const a of AREAS) {
    if (a.secret && !achievements.includes(a.secret)) continue
    if (a.id === 'plaza') continue
    const [x, y] = project(a.pos[0], a.pos[1])
    ctx.fillText(a.icon, x, y)
  }
  return project
}

/** Player arrow (facing in world space) drawn at screen position. */
export function drawPlayer(ctx, x, y, facing, yaw, size = 9) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.PI - (facing - yaw))
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#2a2236'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.lineTo(size * 0.75, size * 0.8)
  ctx.lineTo(0, size * 0.35)
  ctx.lineTo(-size * 0.75, size * 0.8)
  ctx.closePath()
  ctx.stroke()
  ctx.fill()
  ctx.restore()
}

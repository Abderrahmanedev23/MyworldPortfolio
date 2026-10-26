import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useInteractable } from '../interaction'
import { getMoveInput, input } from '../input'
import { isBusy, playerState, useStore } from '../store'
import { audio } from '../audio'
import { spawnRipple } from './Particles'
import { BOAT_MOORING, ISLAND_RADIUS, ISLET } from './layout'

const WATER_Y = -0.32
const MAX_SPEED = 4.2
const SEA_EDGE = 80
const DOCK = { x0: 27.6, x1: 37.6, z: 1.55 }
const seat = new Vector3()

/** A little rowing boat: board it at the dock, row anywhere, get out at the dock, beach or islet. */
export function Boat() {
  const group = useRef()
  const oarL = useRef()
  const oarR = useRef()
  const b = useRef({ x: BOAT_MOORING.pos[0], z: BOAT_MOORING.pos[1], h: BOAT_MOORING.heading, v: 0, turn: 0, stroke: 0, ripple: 0 }).current

  const board = () => {
    playerState.boating = true
    useStore.getState().setBoating(true)
    playerState.sitAt = null
    audio.play('oar')
    useStore.getState().showToast({ title: 'All aboard!', text: 'W / S to row · A / D to steer · E to get out near land.', icon: '⛵' })
  }

  useInteractable('boat', {
    dynamic: () => (playerState.boating || playerState.swimming ? null : [b.x, 0.2, b.z]),
    radius: 2.6,
    heightRange: 2,
    label: 'Row the boat ⛵',
    promptHeight: 1.6,
    onInteract: board,
  })

  // getting out: find the nearest bit of land
  useEffect(() => {
    const exit = () => {
      if (!playerState.boating) return
      const r = Math.hypot(b.x, b.z)
      const di = Math.hypot(b.x - ISLET.pos[0], b.z - ISLET.pos[1])
      let to = null
      if (b.x > DOCK.x0 - 1 && b.x < DOCK.x1 + 1 && Math.abs(b.z) < 3.4) to = [Math.min(Math.max(b.x, 29), 36.5), 0.95, Math.sign(b.z) * 0.6]
      else if (r < ISLAND_RADIUS + 3.2) to = [(b.x / r) * (ISLAND_RADIUS - 1), 0.85, (b.z / r) * (ISLAND_RADIUS - 1)]
      else if (di < ISLET.r + 3.2) {
        const k = (ISLET.r - 1.5) / di
        to = [ISLET.pos[0] + (b.x - ISLET.pos[0]) * k, 0.85, ISLET.pos[1] + (b.z - ISLET.pos[1]) * k]
      }
      if (!to) {
        useStore.getState().showToast({ title: 'Too far from land', text: 'Row up to the dock, a beach or the islet to get out.', icon: '🌊' })
        return
      }
      playerState.boating = false
      useStore.getState().setBoating(false)
      b.v = 0
      playerState.teleport = to
      audio.play('oar')
    }
    window.addEventListener('boat-exit', exit)
    return () => window.removeEventListener('boat-exit', exit)
  }, [b])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    if (playerState.boating && !isBusy()) {
      const m = getMoveInput() // raw forward / right, used as tank controls
      b.v += m.f * 3 * dt
      b.turn += (-m.r * 1.3 - b.turn) * Math.min(1, dt * 4)
      if (Math.abs(m.f) > 0.1) {
        b.stroke += dt * 4.5 * Math.sign(m.f)
        if (Math.floor(b.stroke) !== Math.floor(b.stroke - dt * 4.5 * Math.sign(m.f))) audio.play('oar')
      }
      // keep the camera comfortably behind the boat
      const behind = b.h + Math.PI
      input.cameraYaw += Math.atan2(Math.sin(behind - input.cameraYaw), Math.cos(behind - input.cameraYaw)) * Math.min(1, dt * 1.2)
    } else {
      b.turn *= 0.9
    }
    b.v *= Math.exp(-0.9 * dt) // water drag
    b.v = Math.max(-MAX_SPEED * 0.5, Math.min(MAX_SPEED, b.v))
    b.h += b.turn * dt * (0.4 + Math.min(1, Math.abs(b.v)))
    b.x += Math.sin(b.h) * b.v * dt
    b.z += Math.cos(b.h) * b.v * dt

    // bump off the island, the dock, the islet and the edge of the sea
    const r = Math.hypot(b.x, b.z)
    if (r < ISLAND_RADIUS + 1.4) {
      const k = (ISLAND_RADIUS + 1.4) / r
      b.x *= k
      b.z *= k
      b.v *= -0.3
    }
    if (b.x > DOCK.x0 && b.x < DOCK.x1 && Math.abs(b.z) < DOCK.z) {
      b.z = Math.sign(b.z || 1) * DOCK.z
      b.v *= 0.5
    }
    const ix = b.x - ISLET.pos[0]
    const iz = b.z - ISLET.pos[1]
    const di = Math.hypot(ix, iz)
    if (di < ISLET.r + 1.3) {
      const k = (ISLET.r + 1.3) / di
      b.x = ISLET.pos[0] + ix * k
      b.z = ISLET.pos[1] + iz * k
      b.v *= -0.3
    }
    if (r > SEA_EDGE) {
      b.x *= SEA_EDGE / r
      b.z *= SEA_EDGE / r
      b.v *= -0.3
    }

    const bob = Math.sin(t * 1.6 + b.x) * 0.04
    group.current.position.set(b.x, WATER_Y + 0.22 + bob, b.z)
    group.current.rotation.set(Math.sin(t * 1.3) * 0.03 - b.v * 0.01, b.h, Math.sin(t * 1.1) * 0.04 - b.turn * 0.05)
    const sweep = Math.sin(b.stroke * Math.PI)
    oarL.current.rotation.set(0, 0.2 + sweep * 0.6, 0.35 + Math.cos(b.stroke * Math.PI) * 0.15)
    oarR.current.rotation.set(0, -0.2 - sweep * 0.6, -0.35 - Math.cos(b.stroke * Math.PI) * 0.15)

    if (Math.abs(b.v) > 0.5) {
      b.ripple += dt
      if (b.ripple > 0.35) {
        b.ripple = 0
        spawnRipple(b.x - Math.sin(b.h) * 1.2, b.z - Math.cos(b.h) * 1.2, 0.9, 1.2)
      }
    }
    if (playerState.boating) {
      seat.set(0, -0.02, -0.15).applyEuler(group.current.rotation).add(group.current.position)
      playerState.boatSeat = [seat.x, seat.y, seat.z]
      playerState.boatHeading = b.h
    }
  })

  const wood = '#b5793f'
  return (
    <group ref={group}>
      {/* hull: white lower half-shell, blue gunwale ring, wooden floor */}
      <mesh position={[0, -0.17, 0]} scale={[0.78, 1, 1.62]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 0.86, 0.36, 32, 1, true]} />
        <meshStandardMaterial color="#f4f1ea" side={2} />
      </mesh>
      <mesh position={[0, -0.35, 0]} scale={[0.67, 0.28, 1.39]} castShadow>
        <sphereGeometry args={[1, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#e63946" side={2} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.78, 1.62, 1]}>
        <torusGeometry args={[1, 0.06, 8, 40]} />
        <meshStandardMaterial color="#3a86ff" />
      </mesh>
      <mesh position={[0, -0.24, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.62, 1.32, 1]}>
        <circleGeometry args={[1, 24]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {/* seats */}
      {[-0.15, 0.85].map((z) => (
        <mesh key={z} position={[0, -0.04, z]} castShadow>
          <boxGeometry args={[1.35, 0.06, 0.28]} />
          <meshStandardMaterial color="#8a5a3b" />
        </mesh>
      ))}
      {/* oars */}
      {[
        [oarL, -1],
        [oarR, 1],
      ].map(([ref, s]) => (
        <group key={s} ref={ref} position={[s * 0.72, 0.05, -0.1]}>
          <mesh position={[s * 0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 1.6, 6]} />
            <meshStandardMaterial color="#8a5a3b" />
          </mesh>
          <mesh position={[s * 1.45, 0, 0]}>
            <boxGeometry args={[0.32, 0.03, 0.14]} />
            <meshStandardMaterial color={wood} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

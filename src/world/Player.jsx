import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier'
import { MathUtils } from 'three'
import { Character } from './Character'
import { Avatar } from './Avatar'
import { getMoveInput, input, pollGamepad } from '../input'
import { isBusy, playerState, useStore } from '../store'
import { profile } from '../content'
import { audio } from '../audio'
import { GRASS_RADIUS, ISLAND_RADIUS, ISLET, PATHS, SPAWN, distToSegment } from './layout'

const WALK_SPEED = 3.8
const RUN_SPEED = 7.5
const SWIM_SPEED = 2.4
const SWIM_FAST = 3.8
const JUMP_VELOCITY = 7.5
const HALF_HEIGHT = 0.35
const RADIUS = 0.35
const FOOT = HALF_HEIGHT + RADIUS
const IDLE_WAVE_AFTER = 8 // seconds standing still before a friendly cheer
const WAVE_DURATION = 2.2

export const WATER_Y = -0.32 // sea surface
const SWIM_Y = -0.5 // capsule centre while swimming (head and shoulders above water)
const SEA_LIMIT = 75 // beyond this the current pushes you back
const DOCK = { x0: 28, x1: 37, z: 1 } // walkable dock deck

// Rapier's CoefficientCombineRule.Min: zero friction so the capsule never sticks to walls.
const COMBINE_MIN = 1

const setRig = (rig) => (playerState.rig = rig)

function angleLerp(a, b, t) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a))
  return a + d * t
}

function surfaceAt(x, y, z) {
  if (x > 29.5 && Math.abs(z) < 1.2 && y > 0.75) return 'wood'
  if (useStore.getState().indoors) return 'wood'
  const r = Math.hypot(x, z)
  if (r > GRASS_RADIUS + 0.2) return 'sand'
  if (r < 5.7 || PATHS.some(([a, b]) => distToSegment([x, z], a, b) < 1)) return 'stone'
  return 'grass'
}

export function Player() {
  const body = useRef()
  const visual = useRef()
  const pose = useRef()
  const { rapier, world } = useRapier()
  const idle = useRef(0)
  const waveUntil = useRef(0)
  const coyote = useRef(0)
  const wasGrounded = useRef(true)
  const fallSpeed = useRef(0)
  const stepDist = useRef(0)
  const warned = useRef(false)

  // Dev helper: window.__teleport(x, z) jumps the player around the map.
  if (import.meta.env.DEV) {
    window.__teleport = (x, z, y = 2) => (playerState.teleport = [x, y, z])
    window.__player = playerState
    window.__input = input
  }

  const enterWater = (rb) => {
    playerState.swimming = true
    rb.setGravityScale(0, true)
    audio.play('splash')
    playerState.splashAt = performance.now()
    useStore.getState().unlock('swim')
  }
  const leaveWater = (rb, x, y, z) => {
    playerState.swimming = false
    rb.setGravityScale(1, true)
    rb.setTranslation({ x, y, z }, true)
    rb.setLinvel({ x: 0, y: 2.5, z: 0 }, true)
    audio.play('splash')
    playerState.splashAt = performance.now()
  }

  useFrame((state, delta) => {
    const rb = body.current
    if (!rb) return
    pollGamepad()
    const dt = Math.min(delta, 0.05)
    const now = state.clock.elapsedTime
    const pos = rb.translation()
    const vel = rb.linvel()
    const r = Math.hypot(pos.x, pos.z)

    if (playerState.teleport) {
      const [x, y, z] = playerState.teleport
      playerState.teleport = null
      playerState.sitAt = null
      playerState.swimming = false
      if (playerState.boating) {
        playerState.boating = false
        useStore.getState().setBoating(false)
      }
      rb.setGravityScale(1, true)
      rb.setTranslation({ x, y, z }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      playerState.position.set(x, y, z)
      return
    }

    // ---------------- in the rowing boat ----------------
    if (playerState.boating && playerState.boatSeat) {
      const [sx, sy, sz] = playerState.boatSeat
      rb.setGravityScale(0, true)
      rb.setTranslation({ x: sx, y: sy + FOOT - 0.32, z: sz }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      playerState.swimming = false
      playerState.grounded = false
      playerState.anim = 'sit'
      playerState.facing = playerState.boatHeading
      visual.current.rotation.y = playerState.facing
      pose.current.rotation.x = 0
      pose.current.position.set(0, 0, 0)
      playerState.position.set(sx, sy + FOOT - 0.32, sz)
      return
    }

    const busy = isBusy() || playerState.fishing
    const move = busy ? { f: 0, r: 0, len: 0, run: false } : getMoveInput()

    // Camera-relative movement direction.
    const yaw = input.cameraYaw
    const dx = -Math.sin(yaw) * move.f + Math.cos(yaw) * move.r
    const dz = -Math.cos(yaw) * move.f - Math.sin(yaw) * move.r

    // ---------------- swimming ----------------
    const onDockSpan = pos.x > DOCK.x0 - 0.5 && pos.x < DOCK.x1 + 0.3
    if (!playerState.swimming && pos.y < WATER_Y + 0.05 && r > ISLAND_RADIUS - 0.6) enterWater(rb)
    if (!playerState.swimming && pos.y < -5) {
      playerState.teleport = [...SPAWN] // fell through the world somehow
      return
    }
    if (playerState.swimming) {
      const speed = move.run ? SWIM_FAST : SWIM_SPEED
      const k = 1 - Math.exp(-4 * dt)
      let vx = MathUtils.lerp(vel.x, dx * speed, k)
      let vz = MathUtils.lerp(vel.z, dz * speed, k)
      // a gentle current pushes you back towards the island far out at sea
      if (r > SEA_LIMIT) {
        vx -= (pos.x / r) * 3
        vz -= (pos.z / r) * 3
        if (!warned.current) {
          warned.current = true
          useStore.getState().showToast({ title: 'Whoa, strong current!', text: "It's safer to swim back to the island.", icon: '🌊' })
        }
      }
      // float at the surface: ease towards swim height (frame-rate independent, never overshoots)
      const bob = Math.sin(now * 2.2) * 0.035
      const y = MathUtils.lerp(pos.y, SWIM_Y + bob, 1 - Math.exp(-6 * dt))
      const vy = 0
      rb.setTranslation({ x: pos.x, y, z: pos.z }, true)
      rb.setLinvel({ x: vx, y: vy, z: vz }, true)
      input.jump = false

      if (move.len > 0.1) playerState.facing = angleLerp(playerState.facing, Math.atan2(dx, dz), 1 - Math.exp(-6 * dt))
      visual.current.rotation.y = playerState.facing

      // climb out onto the beach or the dock when swimming into them
      const inward = move.len > 0.1 && dx * -pos.x + dz * -pos.z > 0
      const ix = pos.x - ISLET.pos[0]
      const iz = pos.z - ISLET.pos[1]
      const di = Math.hypot(ix, iz)
      const towardIslet = move.len > 0.1 && dx * -ix + dz * -iz > 0
      if (towardIslet && di < ISLET.r + 0.6) {
        const k = (ISLET.r - 0.8) / di
        leaveWater(rb, ISLET.pos[0] + ix * k, FOOT + 0.15, ISLET.pos[1] + iz * k)
      } else if (inward && r < ISLAND_RADIUS + 0.6 && !onDockSpan) {
        const k2 = (ISLAND_RADIUS - 0.7) / r
        leaveWater(rb, pos.x * k2, FOOT + 0.15, pos.z * k2)
      } else if (onDockSpan && Math.abs(pos.z) < DOCK.z + 0.9 && move.len > 0.1 && dz * -Math.sign(pos.z) > 0.3) {
        leaveWater(rb, pos.x, FOOT + 0.3, Math.sign(pos.z) * 0.6)
      }

      const horiz = Math.hypot(vx, vz)
      stepDist.current += horiz * dt
      if (stepDist.current > 1.1) {
        stepDist.current = 0
        audio.play('stroke')
      }
      playerState.anim = horiz > 0.6 ? 'swim' : 'tread'
      playerState.animSpeed = horiz > 0.6 ? horiz / SWIM_SPEED : 1
      playerState.grounded = false
      playerState.surface = 'water'
      playerState.position.set(pos.x, y, pos.z)
      playerState.velocity.set(vx, vy, vz)
      // lie forward into the stroke, lift the body so the head stays above water
      const swimTilt = playerState.anim === 'swim' ? 1.05 : 0
      pose.current.rotation.x = MathUtils.lerp(pose.current.rotation.x, swimTilt, 1 - Math.exp(-6 * dt))
      pose.current.position.y = MathUtils.lerp(pose.current.position.y, swimTilt ? 0.55 : 0.05, 1 - Math.exp(-6 * dt))
      pose.current.position.z = MathUtils.lerp(pose.current.position.z, swimTilt ? -0.35 : 0, 1 - Math.exp(-6 * dt))
      return
    }
    pose.current.rotation.x = MathUtils.lerp(pose.current.rotation.x, 0, 1 - Math.exp(-10 * dt))
    pose.current.position.y = MathUtils.lerp(pose.current.position.y, 0, 1 - Math.exp(-10 * dt))
    pose.current.position.z = MathUtils.lerp(pose.current.position.z, 0, 1 - Math.exp(-10 * dt))

    // ---------------- on land ----------------
    const ray = new rapier.Ray({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(ray, FOOT + 0.15, true, undefined, undefined, undefined, rb)
    const grounded = !!hit && vel.y < 2.5
    coyote.current = grounded ? 0.1 : Math.max(0, coyote.current - dt)

    // landing: squash, dust and a thud scaled by how hard we hit the ground
    if (!grounded) fallSpeed.current = Math.min(fallSpeed.current, vel.y)
    if (grounded && !wasGrounded.current && fallSpeed.current < -4) {
      playerState.landedAt = now
      playerState.landImpact = Math.min(1, -fallSpeed.current / 14)
      audio.play('land')
    }
    if (grounded) fallSpeed.current = 0
    wasGrounded.current = grounded

    // Sitting on a bench: stay put until the player moves or jumps.
    if (playerState.sitAt) {
      if (move.len > 0.2 || input.jump) {
        playerState.sitAt = null
        rb.setGravityScale(1, true)
        input.jump = false
      } else {
        const s = playerState.sitAt
        rb.setGravityScale(0, true)
        rb.setTranslation({ x: s.position[0], y: s.position[1] + FOOT - 0.12, z: s.position[2] }, true)
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
        playerState.anim = 'sit'
        playerState.facing = s.rotation
        visual.current.rotation.y = angleLerp(visual.current.rotation.y, s.rotation, 0.2)
        playerState.position.set(s.position[0], s.position[1] + FOOT, s.position[2])
        return
      }
    }

    const speed = move.run ? RUN_SPEED : WALK_SPEED
    const control = grounded ? 14 : 4
    const k = 1 - Math.exp(-control * dt)
    const vx = MathUtils.lerp(vel.x, dx * speed, k)
    const vz = MathUtils.lerp(vel.z, dz * speed, k)
    let vy = vel.y

    if (input.jump) {
      if (coyote.current > 0 && !busy) {
        vy = JUMP_VELOCITY
        coyote.current = 0
        playerState.jumpedAt = now
        audio.play('jump')
      }
      input.jump = false
    }
    rb.setLinvel({ x: vx, y: vy, z: vz }, true)

    if (move.len > 0.1) {
      playerState.facing = angleLerp(playerState.facing, Math.atan2(dx, dz), 1 - Math.exp(-12 * dt))
    }
    visual.current.rotation.y = playerState.facing

    // Footsteps
    playerState.surface = surfaceAt(pos.x, pos.y, pos.z)
    const horiz = Math.hypot(vx, vz)
    if (grounded && horiz > 0.5) {
      stepDist.current += horiz * dt
      const stride = move.run ? 0.95 : 0.62
      if (stepDist.current > stride) {
        stepDist.current = 0
        audio.play('step', { surface: playerState.surface })
      }
    }

    // Animation state (fishing drives its own animations).
    if (input.wave) {
      waveUntil.current = now + WAVE_DURATION
      input.wave = false
    }
    if (move.len > 0.1 || !grounded) idle.current = 0
    else idle.current += dt
    if (idle.current > IDLE_WAVE_AFTER && (idle.current - IDLE_WAVE_AFTER) % 14 < dt) {
      waveUntil.current = now + WAVE_DURATION
    }

    playerState.animSpeed = horiz > 0.3 ? horiz / (move.run ? RUN_SPEED : WALK_SPEED) : 1
    if (playerState.fishing) playerState.anim = playerState.fishAnim ?? 'wait'
    else if (useStore.getState().photo && playerState.photoPose) playerState.anim = playerState.photoPose
    else if (!grounded && Math.abs(vy) > 1) playerState.anim = 'jump'
    else if (move.len > 0.1) playerState.anim = move.run ? 'run' : 'walk'
    else if (now < waveUntil.current) playerState.anim = 'wave'
    else playerState.anim = 'idle'

    // squash on landing, stretch on take-off
    let sy = 1
    const sinceLand = now - playerState.landedAt
    const sinceJump = now - playerState.jumpedAt
    if (sinceLand < 0.25) sy -= Math.sin((sinceLand / 0.25) * Math.PI) * 0.22 * (playerState.landImpact ?? 0.5)
    if (sinceJump < 0.22) sy += Math.sin((sinceJump / 0.22) * Math.PI) * 0.1
    pose.current.scale.set(1 + (1 - sy) * 0.6, sy, 1 + (1 - sy) * 0.6)

    playerState.grounded = grounded
    playerState.position.set(pos.x, pos.y, pos.z)
    playerState.velocity.set(vx, vy, vz)
  })

  const quality = useStore((s) => s.settings.quality)
  const night = useStore((s) => s.night)
  const model = profile.avatar.model ?? 'player'
  return (
    <RigidBody
      ref={body}
      name="player"
      colliders={false}
      position={SPAWN}
      enabledRotations={[false, false, false]}
      ccd
      canSleep={false}
    >
      <CapsuleCollider args={[HALF_HEIGHT, RADIUS]} friction={0} frictionCombineRule={COMBINE_MIN} />
      <group ref={visual} position={[0, -FOOT, 0]}>
        <group ref={pose}>
          {model === 'procedural' ? (
            <Avatar colors={profile.avatar} state={playerState} outline={quality !== 'low'} />
          ) : (
            <Character model={model} state={playerState} outline={quality !== 'low'} onReady={setRig} />
          )}
        </group>
      </group>
      {/* a soft lantern glow so you never lose your character at night */}
      {night && <pointLight position={[0, 1.2, 0.8]} color="#ffd59a" intensity={5} distance={7} decay={1.8} />}
    </RigidBody>
  )
}

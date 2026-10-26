import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier'
import { MathUtils } from 'three'
import { Avatar } from './Avatar'
import { getMoveInput, input } from '../input'
import { playerState, useStore } from '../store'
import { profile } from '../content'
import { SPAWN } from './layout'

const WALK_SPEED = 3.8
const RUN_SPEED = 7.5
const JUMP_VELOCITY = 7.5
const HALF_HEIGHT = 0.35
const RADIUS = 0.35
const FOOT = HALF_HEIGHT + RADIUS
const IDLE_WAVE_AFTER = 6 // seconds standing still before a friendly wave
const WAVE_DURATION = 2.2

// Rapier's CoefficientCombineRule.Min: zero friction so the capsule never sticks to walls.
const COMBINE_MIN = 1

function angleLerp(a, b, t) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a))
  return a + d * t
}

export function Player() {
  const body = useRef()
  const visual = useRef()
  const { rapier, world } = useRapier()
  const idle = useRef(0)
  const waveUntil = useRef(0)
  const coyote = useRef(0)

  // Dev helper: window.__teleport(x, z) jumps the player around the map.
  if (import.meta.env.DEV) {
    window.__teleport = (x, z, y = 2) => {
      body.current?.setTranslation({ x, y, z }, true)
      body.current?.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
    window.__player = playerState
    window.__input = input
  }

  useFrame((state, delta) => {
    const rb = body.current
    if (!rb) return
    const dt = Math.min(delta, 0.05)
    const now = state.clock.elapsedTime
    const pos = rb.translation()
    const vel = rb.linvel()

    // Fell into the sea → respawn at the plaza.
    if (pos.y < -4 || playerState.respawn) {
      const fell = !playerState.respawn
      playerState.respawn = false
      rb.setTranslation({ x: SPAWN[0], y: SPAWN[1], z: SPAWN[2] }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      if (fell) useStore.getState().unlock('swim')
      return
    }

    const ray = new rapier.Ray({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(ray, FOOT + 0.15, true, undefined, undefined, undefined, rb)
    const grounded = !!hit && vel.y < 2.5
    coyote.current = grounded ? 0.1 : Math.max(0, coyote.current - dt)

    const { panel } = useStore.getState()
    const move = panel ? { f: 0, r: 0, len: 0, run: false } : getMoveInput()

    // Sitting on a bench: stay put until the player moves or jumps.
    if (playerState.sitAt) {
      if (move.len > 0.2 || input.jump) {
        playerState.sitAt = null
        rb.setGravityScale(1, true)
        input.jump = false
      } else {
        const s = playerState.sitAt
        rb.setGravityScale(0, true)
        rb.setTranslation({ x: s.position[0], y: s.position[1] + FOOT, z: s.position[2] }, true)
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
        playerState.anim = 'sit'
        playerState.facing = s.rotation
        visual.current.rotation.y = angleLerp(visual.current.rotation.y, s.rotation, 0.2)
        playerState.position.set(s.position[0], s.position[1] + FOOT, s.position[2])
        return
      }
    }

    // Camera-relative movement.
    const yaw = input.cameraYaw
    const fx = -Math.sin(yaw)
    const fz = -Math.cos(yaw)
    const rx = Math.cos(yaw)
    const rz = -Math.sin(yaw)
    const dx = fx * move.f + rx * move.r
    const dz = fz * move.f + rz * move.r
    const speed = move.run ? RUN_SPEED : WALK_SPEED
    const control = grounded ? 14 : 4
    const k = 1 - Math.exp(-control * dt)
    let vx = MathUtils.lerp(vel.x, dx * speed, k)
    let vz = MathUtils.lerp(vel.z, dz * speed, k)
    let vy = vel.y

    if (input.jump) {
      if (coyote.current > 0) {
        vy = JUMP_VELOCITY
        coyote.current = 0
      }
      input.jump = false
    }
    rb.setLinvel({ x: vx, y: vy, z: vz }, true)

    if (move.len > 0.1) {
      playerState.facing = angleLerp(playerState.facing, Math.atan2(dx, dz), 1 - Math.exp(-12 * dt))
    }
    visual.current.rotation.y = playerState.facing

    // Animation state.
    if (input.wave) {
      waveUntil.current = now + WAVE_DURATION
      input.wave = false
    }
    if (move.len > 0.1 || !grounded) idle.current = 0
    else idle.current += dt
    if (idle.current > IDLE_WAVE_AFTER && (idle.current - IDLE_WAVE_AFTER) % 12 < dt) {
      waveUntil.current = now + WAVE_DURATION
    }

    if (!grounded && Math.abs(vy) > 1) playerState.anim = 'jump'
    else if (move.len > 0.1) playerState.anim = move.run ? 'run' : 'walk'
    else if (now < waveUntil.current) playerState.anim = 'wave'
    else playerState.anim = 'idle'

    playerState.grounded = grounded
    playerState.position.set(pos.x, pos.y, pos.z)
    playerState.velocity.set(vx, vy, vz)
  })

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
        <Avatar colors={profile.avatar} state={playerState} />
      </group>
    </RigidBody>
  )
}

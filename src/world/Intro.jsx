import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, Quaternion, Vector3 } from 'three'
import { input } from '../input'
import { playerState, useStore } from '../store'
import { audio } from '../audio'
import { profile } from '../content'
import { Label } from './Label'
import { SPAWN } from './layout'

// Opening cinematic: a seaplane trailing a banner flies over the island,
// the character jumps out, free-falls, opens a parachute and lands on the plaza.
// Shared with Player (drives the body) and CameraRig (drives the camera).
export const introState = { active: false, pos: new Vector3(), anim: 'jump', facing: 0, hidden: true, cam: new Vector3(), look: new Vector3() }

const T_JUMP = 2.6 // plane is overhead
const T_OPEN = 3.7 // parachute opens
const T_LAND = 8.2
const T_END = 9.2
const JUMP_Y = 27
const OPEN_Y = 19
const LAND = new Vector3(SPAWN[0], 0.7, SPAWN[2])
const PLANE_DIR = new Vector3(1, 0, -0.55).normalize()
const PLANE_SPEED = 20

// ?introSpeed=0.2 plays the cinematic in slow motion (handy for screenshots)
const SPEED = Number(new URLSearchParams(window.location.search).get('introSpeed')) || 1

const planeAt = (t, out) => out.copy(LAND).setY(JUMP_Y + 1.2).addScaledVector(PLANE_DIR, (t - T_JUMP) * PLANE_SPEED)

function Plane({ planeRef, propRef }) {
  const red = '#e63946'
  const white = '#f8f4ec'
  return (
    <group ref={planeRef}>
      {/* the model is built facing +x */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.45, 2.2, 8, 16]} />
        <meshStandardMaterial color={white} emissive="#5a5650" />
      </mesh>
      <mesh position={[0.35, 0.28, 0]} scale={[0.6, 0.35, 0.5]}>
        <sphereGeometry args={[0.6, 16, 10]} />
        <meshStandardMaterial color="#8ecae6" roughness={0.1} metalness={0.3} />
      </mesh>
      <mesh position={[0.3, 0.05, 0]} castShadow>
        <boxGeometry args={[0.9, 0.08, 5.2]} />
        <meshStandardMaterial color={red} />
      </mesh>
      <mesh position={[-1.45, 0.15, 0]}>
        <boxGeometry args={[0.5, 0.06, 1.8]} />
        <meshStandardMaterial color={red} />
      </mesh>
      <mesh position={[-1.5, 0.55, 0]}>
        <boxGeometry args={[0.55, 0.75, 0.06]} />
        <meshStandardMaterial color={red} />
      </mesh>
      {/* floats */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0.2, -0.95, s * 0.9]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.16, 1.8, 4, 10]} />
            <meshStandardMaterial color={white} emissive="#5a5650" />
          </mesh>
          <mesh position={[0.2, -0.6, s * 0.9]}>
            <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
            <meshStandardMaterial color="#555" />
          </mesh>
        </group>
      ))}
      <mesh position={[1.62, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.18, 0.3, 12]} />
        <meshStandardMaterial color={red} />
      </mesh>
      <group ref={propRef} position={[1.78, 0, 0]}>
        {[0, Math.PI / 2].map((r) => (
          <mesh key={r} rotation={[r, 0, 0]}>
            <boxGeometry args={[0.04, 1.3, 0.1]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        ))}
      </group>
      {/* banner trailing behind */}
      <mesh position={[-2.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 1.8, 4]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <group position={[-5.6, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[4.4, 0.9]} />
          <meshStandardMaterial color="#fff9ef" side={2} />
        </mesh>
        <Label text={`✨ Welcome to ${profile.name}'s World ✨`} size={0.6} background={null} color="#e63946" position={[0, 0, 0.01]} />
        <group rotation={[0, Math.PI, 0]}>
          <Label text={`✨ Welcome to ${profile.name}'s World ✨`} size={0.6} background={null} color="#e63946" position={[0, 0, 0.01]} />
        </group>
      </group>
    </group>
  )
}

const STRIPES = ['#ff6b6b', '#ffd166', '#4dabf7', '#ffffff', '#ff6b6b', '#ffd166', '#4dabf7', '#ffffff']

// suspension lines from the canopy rim down to the harness
const LINES = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2
  const top = new Vector3(Math.cos(a) * 1.85, 3.65, Math.sin(a) * 1.85)
  const bottom = new Vector3(0, 1.25, 0)
  const dir = top.clone().sub(bottom)
  const len = dir.length()
  return {
    mid: top.clone().add(bottom).multiplyScalar(0.5),
    quat: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize()),
    len,
  }
})

function Parachute({ chuteRef }) {
  return (
    <group ref={chuteRef}>
      <group position={[0, 3.2, 0]}>
        {STRIPES.map((c, i) => (
          <mesh key={i} castShadow>
            <sphereGeometry args={[1.9, 6, 8, (i / STRIPES.length) * Math.PI * 2, (Math.PI * 2) / STRIPES.length, 0, Math.PI * 0.42]} />
            <meshStandardMaterial color={c} side={2} />
          </mesh>
        ))}
      </group>
      {/* lines from the canopy rim to the harness */}
      {LINES.map(({ mid, quat, len }, i) => (
        <mesh key={i} position={mid} quaternion={quat}>
          <cylinderGeometry args={[0.008, 0.008, len, 3]} />
          <meshStandardMaterial color="#eee" />
        </mesh>
      ))}
    </group>
  )
}

export function Intro() {
  const intro = useStore((s) => s.intro)
  const planeRef = useRef()
  const propRef = useRef()
  const chuteRef = useRef()
  const time = useRef(0)
  const flags = useRef({})
  const tmp = useMemo(() => new Vector3(), [])
  const jumpFrom = useMemo(() => new Vector3(), [])

  const finish = () => {
    if (!introState.active) return
    introState.active = false
    introState.hidden = false
    audio.setEngine(0)
    playerState.teleport = [LAND.x, LAND.y + 0.1, LAND.z]
    input.cameraYaw = 0
    useStore.getState().endIntro()
    window.dispatchEvent(new Event('intro-done'))
  }

  useEffect(() => {
    if (!intro) return
    introState.active = true
    introState.hidden = true
    time.current = 0
    flags.current = {}
    const skip = () => finish()
    window.addEventListener('intro-skip', skip)
    return () => window.removeEventListener('intro-skip', skip)
  }, [intro])

  useFrame(({ clock }, delta) => {
    if (!introState.active) {
      if (planeRef.current) planeRef.current.visible = false
      if (chuteRef.current) chuteRef.current.visible = false
      return
    }
    time.current += Math.min(delta, 0.1) * SPEED
    const t = time.current
    const f = flags.current
    const plane = planeRef.current
    const chute = chuteRef.current

    // plane: flies straight over the plaza, a little bank and bob
    planeAt(t, tmp)
    plane.visible = t < T_END
    plane.position.copy(tmp)
    plane.position.y += Math.sin(t * 1.5) * 0.25
    plane.rotation.set(Math.sin(t * 1.2) * 0.06, -Math.atan2(PLANE_DIR.z, PLANE_DIR.x), 0)
    propRef.current.rotation.x = t * 40
    const dPlane = tmp.distanceTo(LAND)
    audio.setEngine(Math.max(0, 1 - dPlane / 70))

    const p = introState.pos
    if (t < T_JUMP) {
      introState.hidden = true
      p.copy(tmp)
      introState.anim = 'jump'
    } else {
      if (!f.jumped) {
        f.jumped = true
        jumpFrom.copy(tmp).setY(JUMP_Y)
        audio.play('wind')
      }
      introState.hidden = false
      introState.facing = Math.PI
      if (t < T_OPEN) {
        // free fall, drifting towards the landing spot
        const k = (t - T_JUMP) / (T_OPEN - T_JUMP)
        p.lerpVectors(jumpFrom, LAND, k * 0.25)
        p.y = MathUtils.lerp(JUMP_Y, OPEN_Y, k * k)
        introState.anim = 'jump'
      } else if (t < T_LAND) {
        if (!f.opened) {
          f.opened = true
          audio.play('chute')
          f.from = p.clone()
        }
        const k = (t - T_OPEN) / (T_LAND - T_OPEN)
        const e = 1 - Math.pow(1 - k, 2.2)
        p.lerpVectors(f.from, LAND, e)
        // gentle swing under the canopy
        p.x += Math.sin(t * 1.8) * 0.6 * (1 - k)
        p.z += Math.cos(t * 1.4) * 0.4 * (1 - k)
        introState.anim = 'sit'
      } else {
        if (!f.landed) {
          f.landed = true
          playerState.landedAt = clock.elapsedTime
          playerState.landImpact = 0.7
          audio.play('land')
          audio.play('achievement')
        }
        p.copy(LAND)
        introState.anim = 'wave'
      }
    }

    // parachute: pops open, then collapses after landing
    const opened = t >= T_OPEN
    chute.visible = opened && t < T_END
    if (chute.visible) {
      const open = Math.min(1, (t - T_OPEN) / 0.35)
      const collapse = t > T_LAND ? Math.min(1, (t - T_LAND) / 0.8) : 0
      chute.position.set(p.x, p.y - 0.7, p.z)
      chute.scale.set(0.2 + open * 0.8, (0.2 + open * 0.8) * (1 - collapse * 0.9), 0.2 + open * 0.8)
      chute.rotation.set(Math.cos(t * 1.4) * 0.12, 0, -Math.sin(t * 1.8) * 0.15 + collapse * 1.2)
    }

    // cinematic camera
    if (t < T_JUMP) {
      introState.cam.set(LAND.x - 9, 6, LAND.z + 16)
      introState.look.copy(tmp)
    } else if (t < T_LAND) {
      introState.cam.set(p.x - 7, p.y + 2.5, p.z + 9)
      introState.look.set(p.x, p.y + (opened ? 1.2 : 0), p.z)
    } else {
      introState.cam.set(LAND.x, LAND.y + 4, LAND.z + 7.5)
      introState.look.set(LAND.x, LAND.y + 0.6, LAND.z)
    }

    if (t >= T_END) finish()
  })

  return (
    <>
      <Plane planeRef={planeRef} propRef={propRef} />
      <Parachute chuteRef={chuteRef} />
    </>
  )
}

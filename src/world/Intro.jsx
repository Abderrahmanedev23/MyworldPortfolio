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
export const introState = {
  active: false,
  pos: new Vector3(),
  anim: 'idle',
  facing: 0,
  tilt: 0, // forward rotation of the body (flip, belly-down skydive)
  hidden: false,
  cam: new Vector3(),
  look: new Vector3(),
  snap: false, // jump the camera straight to the first shot
}

const T_CHEER = 1.9 // character cheers on the float
const T_JUMP = 3.2 // plane is overhead: leap!
const T_OPEN = 4.9 // parachute opens
const T_LAND = 9.6
const T_END = 10.8
const JUMP_Y = 27
const OPEN_Y = 18
const LAND = new Vector3(SPAWN[0], 0.7, SPAWN[2])
const PLANE_DIR = new Vector3(1, 0, -0.55).normalize()
const PLANE_SIDE = new Vector3(-PLANE_DIR.z, 0, PLANE_DIR.x) // right-hand side of the plane
const PLANE_SPEED = 18
const FLOAT_OFFSET = new Vector3() // where the character stands (right float), set per frame
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)

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

// Clouds the plane flies through during the opening shot.
function IntroClouds({ cloudsRef }) {
  const puffs = useMemo(() => {
    const out = []
    const p = new Vector3()
    ;[0.6, 1.5, 2.4].forEach((t, i) => {
      planeAt(t, p)
      const side = (i % 2 ? -1 : 1) * (2.5 + i)
      for (let k = 0; k < 6; k++) {
        out.push({
          pos: [p.x + PLANE_SIDE.x * side + (Math.random() - 0.5) * 4, p.y - 1 + Math.random() * 2.5, p.z + PLANE_SIDE.z * side + (Math.random() - 0.5) * 4],
          s: 1.4 + Math.random() * 1.6,
        })
      }
    })
    return out
  }, [])
  return (
    <group ref={cloudsRef}>
      {puffs.map((c, i) => (
        <mesh key={i} position={c.pos} scale={[c.s, c.s * 0.75, c.s]}>
          <icosahedronGeometry args={[1, 3]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} roughness={1} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// Wind streaks rushing past during free fall.
function Streaks({ streaksRef }) {
  const lines = useMemo(() => Array.from({ length: 26 }, () => ({ x: (Math.random() - 0.5) * 5, z: (Math.random() - 0.5) * 5, o: Math.random() * 6, s: 0.6 + Math.random() })), [])
  return (
    <group ref={streaksRef}>
      {lines.map((l, i) => (
        <mesh key={i} position={[l.x, 0, l.z]} userData={l}>
          <boxGeometry args={[0.02, 1.4 * l.s, 0.02]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export function Intro() {
  const intro = useStore((s) => s.intro)
  const setCaption = useStore((s) => s.setIntroCaption)
  const planeRef = useRef()
  const propRef = useRef()
  const chuteRef = useRef()
  const cloudsRef = useRef()
  const streaksRef = useRef()
  const time = useRef(0)
  const flags = useRef({})
  const tmp = useMemo(() => new Vector3(), [])
  const jumpFrom = useMemo(() => new Vector3(), [])
  const vel = useMemo(() => new Vector3(), [])

  const finish = () => {
    if (!introState.active) return
    introState.active = false
    introState.hidden = false
    introState.tilt = 0
    audio.setEngine(0)
    playerState.teleport = [LAND.x, LAND.y + 0.1, LAND.z]
    input.cameraYaw = 0
    setCaption(null)
    useStore.getState().endIntro()
    window.dispatchEvent(new Event('intro-done'))
  }

  useEffect(() => {
    if (!intro) return
    introState.active = true
    introState.hidden = false
    introState.snap = true
    introState.tilt = 0
    time.current = 0
    flags.current = {}
    const skip = () => finish()
    window.addEventListener('intro-skip', skip)
    return () => window.removeEventListener('intro-skip', skip)
  }, [intro])

  useFrame(({ clock }, delta) => {
    const plane = planeRef.current
    const chute = chuteRef.current
    if (!introState.active) {
      plane.visible = false
      chute.visible = false
      cloudsRef.current.visible = false
      streaksRef.current.visible = false
      return
    }
    const dt = Math.min(delta, 0.1) * SPEED
    time.current += dt
    const t = time.current
    const f = flags.current
    cloudsRef.current.visible = t < T_JUMP + 1

    // captions in the letterbox
    const caption = t < 2.6 ? 'sea' : t > 5.6 && t < T_LAND + 0.3 ? 'title' : null
    if (caption !== f.caption) {
      f.caption = caption
      setCaption(caption)
    }

    // ---- plane: straight over the plaza, then banks away and climbs ----
    planeAt(t, tmp)
    const after = Math.max(0, t - T_JUMP)
    tmp.y += after * after * 0.25
    plane.visible = t < T_END
    plane.position.copy(tmp)
    plane.position.y += Math.sin(t * 1.5) * 0.2
    const heading = -Math.atan2(PLANE_DIR.z, PLANE_DIR.x)
    plane.rotation.set(Math.sin(t * 1.2) * 0.05 - Math.min(0.45, after * 0.25), heading, Math.min(0.2, after * 0.1))
    propRef.current.rotation.x = t * 40
    audio.setEngine(Math.max(0.15, 1 - tmp.distanceTo(LAND) / 60) * (t < T_END ? 1 : 0))

    // the right-hand float, in world space
    FLOAT_OFFSET.set(0.2, -0.95 + 0.12, 0.9).applyEuler(plane.rotation)

    const p = introState.pos
    introState.hidden = false
    if (t < T_JUMP) {
      // standing on the float, holding on; cheers when the island is close
      p.copy(plane.position).add(FLOAT_OFFSET)
      p.y += 0.7
      introState.facing = Math.atan2(PLANE_SIDE.x, PLANE_SIDE.z) // looking out to the side
      introState.anim = t > T_CHEER ? 'wave' : 'idle'
      introState.tilt = 0
    } else if (t < T_OPEN) {
      if (!f.jumped) {
        f.jumped = true
        jumpFrom.copy(p)
        vel.copy(PLANE_SIDE).multiplyScalar(3).addScaledVector(PLANE_DIR, 4)
        vel.y = 4
        audio.play('jump')
        audio.play('wind')
      }
      // ballistic hop off the float, then drift towards the landing spot
      const k = t - T_JUMP
      const fall = (T_OPEN - T_JUMP)
      p.copy(jumpFrom).addScaledVector(vel, Math.min(k, 0.7))
      p.y = jumpFrom.y + vel.y * k - 0.5 * 11 * k * k
      p.lerp(tmp.set(LAND.x, p.y, LAND.z), ease(Math.min(1, k / fall)) * 0.3)
      p.y = Math.max(p.y, OPEN_Y)
      // front flip, then hold a belly-down skydive pose
      const flip = Math.min(1, k / 0.75)
      introState.tilt = ease(flip) * (Math.PI * 2 + 1.25) + Math.sin(t * 7) * 0.05 * flip
      introState.facing = Math.atan2(LAND.x - p.x, LAND.z - p.z) || Math.PI
      introState.anim = 'jump'
    } else if (t < T_LAND) {
      if (!f.opened) {
        f.opened = true
        f.from = p.clone()
        f.openAt = t
        audio.play('chute')
      }
      const k = (t - T_OPEN) / (T_LAND - T_OPEN)
      p.lerpVectors(f.from, LAND, 1 - Math.pow(1 - k, 2.2))
      // jolt upwards when the canopy catches air, then a gentle swing
      const sinceOpen = t - f.openAt
      p.y += Math.sin(Math.min(1, sinceOpen / 0.5) * Math.PI) * 1.2
      p.x += Math.sin(t * 1.8) * 0.6 * (1 - k)
      p.z += Math.cos(t * 1.4) * 0.4 * (1 - k)
      introState.tilt = (Math.PI * 2 + 1.25) * Math.max(0, 1 - sinceOpen / 0.45) + Math.sin(t * 1.8) * 0.08 * (1 - k)
      introState.facing = Math.PI
      introState.anim = 'sit'
    } else {
      if (!f.landed) {
        f.landed = true
        playerState.landedAt = clock.elapsedTime // drives the squash, camera dip and dust puff
        playerState.landImpact = 0.8
        audio.play('land')
        audio.play('achievement')
      }
      p.copy(LAND)
      introState.tilt = 0
      introState.facing = Math.PI
      introState.anim = 'wave'
    }

    // ---- parachute: pops open, then collapses off to the side ----
    chute.visible = t >= T_OPEN && t < T_END
    if (chute.visible) {
      const open = Math.min(1, (t - T_OPEN) / 0.35)
      const flutter = Math.sin((t - T_OPEN) * 30) * 0.08 * (1 - Math.min(1, (t - T_OPEN) / 0.6))
      const collapse = t > T_LAND ? Math.min(1, (t - T_LAND) / 0.9) : 0
      chute.position.set(p.x + collapse * 1.6, p.y - 0.7 - collapse * 0.3, p.z)
      const s = 0.2 + open * 0.8 + flutter
      chute.scale.set(s, s * (1 - collapse * 0.92), s)
      chute.rotation.set(Math.cos(t * 1.4) * 0.12, 0, -Math.sin(t * 1.8) * 0.15 * (1 - collapse) - collapse * 1.3)
    }

    // ---- wind streaks while falling ----
    const falling = t >= T_JUMP && t < T_OPEN + 0.3
    streaksRef.current.visible = falling
    if (falling) {
      streaksRef.current.position.copy(p)
      streaksRef.current.children.forEach((m) => {
        const l = m.userData
        m.position.y = ((l.o + t * 18 * l.s) % 8) - 4
      })
    }

    // ---- cinematic camera ----
    if (t < T_JUMP) {
      // chase cam alongside the plane, swinging round to the float
      const k = ease(Math.min(1, t / T_JUMP))
      introState.cam
        .copy(plane.position)
        .addScaledVector(PLANE_DIR, -9 + k * 6)
        .addScaledVector(PLANE_SIDE, 4 + k * 3)
      introState.cam.y += 2.2 - k * 1
      introState.look.copy(plane.position).addScaledVector(PLANE_DIR, 3 - k * 3).addScaledVector(PLANE_SIDE, k * 0.9)
    } else if (t < T_LAND) {
      introState.cam.set(p.x - 6, p.y + 2.2, p.z + 8)
      introState.look.set(p.x, p.y + (t >= T_OPEN ? 1.4 : 0), p.z)
      if (f.openAt !== undefined && t - f.openAt < 0.5) {
        const shake = (0.5 - (t - f.openAt)) * 0.5
        introState.cam.x += (Math.random() - 0.5) * shake
        introState.cam.y += (Math.random() - 0.5) * shake
      }
    } else {
      introState.cam.set(LAND.x + 1.5, LAND.y + 3.2, LAND.z + 6.5)
      introState.look.set(LAND.x, LAND.y + 0.8, LAND.z)
    }

    if (t >= T_END) finish()
  })

  return (
    <>
      <Plane planeRef={planeRef} propRef={propRef} />
      <Parachute chuteRef={chuteRef} />
      <IntroClouds cloudsRef={cloudsRef} />
      <Streaks streaksRef={streaksRef} />
    </>
  )
}

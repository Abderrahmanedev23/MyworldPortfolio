import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import { Color, MathUtils, Object3D, Vector3 } from 'three'
import { playerState, useStore } from '../store'
import { rng } from './layout'

/** Local time in hours; `?hour=21` in the URL overrides it for testing. */
function currentHour() {
  const q = new URLSearchParams(window.location.search).get('hour')
  if (q !== null && !Number.isNaN(Number(q))) return Number(q)
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60
}

function sunFor(hour) {
  // 6:00 sunrise, 12:00 zenith, 18:00 sunset
  const a = ((hour - 6) / 12) * Math.PI
  const dir = new Vector3(Math.cos(a), Math.sin(a), 0.45).normalize()
  const daylight = MathUtils.clamp((dir.y + 0.08) / 0.35, 0, 1)
  return { dir, daylight }
}

const DAY_SKY = new Color('#bfe6ff')
const DUSK_SKY = new Color('#ffb38a')
const NIGHT_SKY = new Color('#0b1026')

/** Real-time day/night cycle: sun, moon, sky, fog, stars. */
export function DayNight({ shadows }) {
  const [hour, setHour] = useState(currentHour)
  const light = useRef()
  const setNight = useStore((s) => s.setNight)
  useEffect(() => {
    const id = setInterval(() => setHour(currentHour()), 60_000)
    return () => clearInterval(id)
  }, [])

  const { dir, daylight } = useMemo(() => sunFor(hour), [hour])
  const night = daylight < 0.15
  useEffect(() => setNight(night), [night, setNight])

  const skyColor = useMemo(() => {
    const dusk = 1 - Math.abs(daylight - 0.5) * 2 // peaks around sunrise/sunset
    return NIGHT_SKY.clone().lerp(DAY_SKY, daylight).lerp(DUSK_SKY, dusk * 0.35)
  }, [daylight])

  const lightDir = night ? new Vector3(-dir.x, Math.max(-dir.y, 0.4), -dir.z).normalize() : dir
  const sunColor = new Color('#fff1d6').lerp(new Color('#ff9e6b'), 1 - daylight)

  // keep the shadow camera centred on the player
  useFrame(() => {
    const l = light.current
    if (!l) return
    const p = playerState.position
    l.position.set(p.x + lightDir.x * 30, p.y + lightDir.y * 30, p.z + lightDir.z * 30)
    l.target.position.set(p.x, p.y, p.z)
    l.target.updateMatrixWorld()
  })

  return (
    <>
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[skyColor, 45, 140]} />
      {!night && <Sky distance={450} sunPosition={dir.toArray()} turbidity={4} rayleigh={1.2} mieCoefficient={0.004} />}
      {daylight < 0.5 && <Stars radius={120} depth={40} count={night ? 2500 : 800} factor={4} fade speed={0.5} />}
      <hemisphereLight args={[night ? '#3b4a7a' : '#dff3ff', night ? '#1d2a1e' : '#6b8f4e', night ? 0.45 : 0.6 + daylight * 0.5]} />
      <ambientLight intensity={night ? 0.15 : 0.25} />
      <directionalLight
        ref={light}
        castShadow={shadows}
        color={night ? '#9db4ff' : sunColor}
        intensity={night ? 0.55 : 0.6 + daylight * 2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
    </>
  )
}

export function Clouds() {
  const group = useRef()
  const clouds = useMemo(() => {
    const rand = rng(42)
    return Array.from({ length: 9 }, (_, i) => ({
      angle: (i / 9) * Math.PI * 2,
      r: 18 + rand() * 30,
      y: 16 + rand() * 8,
      speed: 0.01 + rand() * 0.015,
      puffs: Array.from({ length: 3 + Math.floor(rand() * 3) }, (_, k) => [k * 1.4 - 2, rand() * 0.6, rand() - 0.5, 1 + rand() * 0.8]),
    }))
  }, [])
  useFrame(({ clock }) => {
    group.current.children.forEach((c, i) => {
      const cl = clouds[i]
      const a = cl.angle + clock.elapsedTime * cl.speed
      c.position.set(Math.cos(a) * cl.r, cl.y, Math.sin(a) * cl.r)
      c.rotation.y = -a
    })
  })
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i}>
          {c.puffs.map(([x, y, z, s], k) => (
            <mesh key={k} position={[x, y, z]} scale={s}>
              <icosahedronGeometry args={[1.2, 1]} />
              <meshStandardMaterial color="#ffffff" flatShading transparent opacity={0.92} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export function Birds() {
  const night = useStore((s) => s.night)
  const group = useRef()
  const birds = useMemo(() => {
    const rand = rng(9)
    return Array.from({ length: 6 }, (_, i) => ({
      r: 10 + rand() * 18,
      y: 9 + rand() * 6,
      speed: 0.25 + rand() * 0.2,
      phase: (i / 6) * Math.PI * 2,
      dir: i % 2 ? 1 : -1,
    }))
  }, [])
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.children.forEach((b, i) => {
      const d = birds[i]
      const a = d.phase + t * d.speed * d.dir
      b.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * 0.7 + i) * 0.8, Math.sin(a) * d.r)
      b.rotation.y = -a + (d.dir > 0 ? Math.PI : 0)
      const flap = Math.sin(t * 10 + i) * 0.7
      b.children[0].rotation.z = flap
      b.children[1].rotation.z = -flap
    })
  })
  if (night) return null
  return (
    <group ref={group}>
      {birds.map((_, i) => (
        <group key={i}>
          {[1, -1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.3, 0, 0]}>
                <boxGeometry args={[0.6, 0.03, 0.22]} />
                <meshStandardMaterial color="#2b2d42" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}

// Footprints that appear when walking on the sand and slowly fade away.
const MAX_PRINTS = 80
const dummy = new Object3D()
export function Footprints() {
  const mesh = useRef()
  const prints = useRef(Array.from({ length: MAX_PRINTS }, () => ({ x: 0, z: 0, rot: 0, age: 99 })))
  const next = useRef(0)
  const last = useRef(new Vector3())
  const side = useRef(1)

  useFrame((_, delta) => {
    const p = playerState.position
    const r = Math.hypot(p.x, p.z)
    const onSand = r > 26.3 && r < 32 && p.y < 0.9
    const walking = playerState.anim === 'walk' || playerState.anim === 'run'
    if (onSand && walking && playerState.grounded && last.current.distanceTo(p) > 0.55) {
      last.current.copy(p)
      side.current *= -1
      const f = playerState.facing
      const pr = prints.current[next.current]
      pr.x = p.x + Math.cos(f) * 0.13 * side.current
      pr.z = p.z - Math.sin(f) * 0.13 * side.current
      pr.rot = f
      pr.age = 0
      next.current = (next.current + 1) % MAX_PRINTS
    }
    prints.current.forEach((pr, i) => {
      pr.age += delta
      const s = MathUtils.clamp(1 - pr.age / 10, 0, 1)
      dummy.position.set(pr.x, 0.015, pr.z)
      dummy.rotation.set(-Math.PI / 2, 0, pr.rot)
      dummy.scale.set(s * 0.6, s, s)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX_PRINTS]} frustumCulled={false}>
      <circleGeometry args={[0.08, 8]} />
      <meshBasicMaterial color="#c9a96e" transparent opacity={0.8} depthWrite={false} />
    </instancedMesh>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, Sky, Stars } from '@react-three/drei'
import { AdditiveBlending, Color, MathUtils, Object3D, Vector3 } from 'three'
import { playerState, useStore } from '../store'
import { uniforms } from './shaders'
import { audio } from '../audio'
import { GRASS_RADIUS, rng } from './layout'

/** Local time in hours; `?hour=21` in the URL overrides it for testing. */
function currentHour() {
  const q = new URLSearchParams(window.location.search).get('hour')
  if (q !== null && q !== '' && !Number.isNaN(Number(q))) return Number(q)
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

const DAY_SKY = new Color('#a9dcff')
const DUSK_SKY = new Color('#ffb08a')
const NIGHT_SKY = new Color('#0e1433')
const RAIN_SKY = new Color('#8d99a8')

/** Updates the shared shader uniforms (time, player position, night) once per frame. */
export function ShaderClock() {
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uPlayer.value.copy(playerState.position)
  })
  return null
}

/** Real-time day/night cycle: sun, moon, sky, fog, stars and environment light. */
export function DayNight() {
  const [hour, setHour] = useState(currentHour)
  const light = useRef()
  const setNight = useStore((s) => s.setNight)
  const quality = useStore((s) => s.settings.quality)
  const raining = useStore((s) => s.weather === 'rain')
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const id = setInterval(() => setHour(currentHour()), 60_000)
    return () => clearInterval(id)
  }, [])

  const { dir, daylight } = useMemo(() => sunFor(hour), [hour])
  const night = daylight < 0.15
  useEffect(() => {
    setNight(night)
    audio.setNight(night)
    uniforms.uNight.value = night ? 1 : 0
  }, [night, setNight])

  const dusk = 1 - Math.abs(daylight - 0.5) * 2 // peaks around sunrise / sunset
  const skyColor = useMemo(() => {
    const c = NIGHT_SKY.clone().lerp(DAY_SKY, daylight).lerp(DUSK_SKY, dusk * 0.35)
    return raining ? c.lerp(night ? NIGHT_SKY : RAIN_SKY, 0.75) : c
  }, [daylight, dusk, raining, night])
  const dim = raining ? 0.45 : 1
  useEffect(() => {
    scene.environmentIntensity = night ? 0.25 : 0.55 + daylight * 0.45
  }, [scene, night, daylight])

  const lightDir = night ? new Vector3(-dir.x, Math.max(-dir.y, 0.45), -dir.z).normalize() : dir
  const sunColor = new Color('#fff0d4').lerp(new Color('#ff9466'), dusk * 0.8)
  const shadowSize = quality === 'high' ? 2048 : 1024

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
      <fog attach="fog" args={[skyColor, raining ? 30 : 55, raining ? 110 : 170]} />
      {!night && !raining && <Sky distance={450} sunPosition={dir.toArray()} turbidity={2.2} rayleigh={2.2} mieCoefficient={0.004} mieDirectionalG={0.8} />}
      {daylight < 0.5 && !raining && <Stars radius={140} depth={40} count={night ? 3000 : 800} factor={4} fade speed={0.4} />}
      {quality !== 'low' && (
      <Environment frames={1} resolution={64}>
        <Lightformer form="ring" intensity={night ? 0.4 : 1.4} color={night ? '#4a5ba8' : '#cfeaff'} scale={40} position={[0, 20, 0]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={night ? 0.2 : 1.2} color={night ? '#283460' : '#ffe2b8'} scale={[30, 8, 1]} position={[0, 4, -20]} />
        <Lightformer intensity={0.6} color={night ? '#1b2a2a' : '#8fcf7a'} scale={[40, 40, 1]} position={[0, -10, 0]} rotation-x={-Math.PI / 2} />
      </Environment>
      )}
      <hemisphereLight
        args={[night ? '#40508a' : '#e6f5ff', night ? '#18241d' : '#7fa35a', (night ? 0.35 : 0.45 + daylight * 0.35) * (quality === 'low' ? 1.8 : 1) * (raining ? 1.15 : 1)]}
      />
      <directionalLight
        ref={light}
        castShadow={quality !== 'low'}
        color={night ? '#a8bcff' : sunColor}
        intensity={(night ? 0.6 : 0.8 + daylight * 2.1) * dim}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={4}
      />
    </>
  )
}

export function Clouds() {
  const group = useRef()
  const night = useStore((s) => s.night)
  const raining = useStore((s) => s.weather === 'rain')
  const clouds = useMemo(() => {
    const rand = rng(42)
    return Array.from({ length: 10 }, (_, i) => ({
      angle: (i / 10) * Math.PI * 2 + rand(),
      r: 22 + rand() * 34,
      y: 17 + rand() * 9,
      speed: 0.008 + rand() * 0.012,
      scale: 0.8 + rand() * 0.8,
      puffs: Array.from({ length: 5 + Math.floor(rand() * 4) }, (_, k) => {
        const x = (k - 3) * 1.15 + (rand() - 0.5) * 0.6
        const s = 1.6 - Math.abs(k - 3) * 0.22 + rand() * 0.4
        return [x, rand() * 0.5 + s * 0.3, (rand() - 0.5) * 1.4, s]
      }),
    }))
  }, [])
  useFrame(({ clock }) => {
    group.current.children.forEach((c, i) => {
      const cl = clouds[i]
      const a = cl.angle + clock.elapsedTime * cl.speed
      c.position.set(Math.cos(a) * cl.r, (raining ? cl.y - 4 : cl.y) + Math.sin(clock.elapsedTime * 0.2 + i) * 0.3, Math.sin(a) * cl.r)
      c.rotation.y = -a
    })
  })
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} scale={raining ? c.scale * 1.5 : c.scale}>
          {c.puffs.map(([x, y, z, s], k) => (
            <mesh key={k} position={[x, y, z]} scale={[s, s * 0.78, s]}>
              <icosahedronGeometry args={[1, 3]} />
              <meshStandardMaterial
                color={night ? '#4b5680' : raining ? '#9aa3b0' : '#ffffff'}
                emissive={night ? '#1a2040' : raining ? '#5a6370' : '#ffffff'}
                emissiveIntensity={night ? 0.2 : raining ? 0.1 : 0.18}
                roughness={1}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/** Glowing fireflies drifting over the grass at night (they bloom nicely). */
export function Fireflies({ count = 70 }) {
  const night = useStore((s) => s.night)
  const mesh = useRef()
  const flies = useMemo(() => {
    const rand = rng(5)
    return Array.from({ length: count }, () => {
      const a = rand() * Math.PI * 2
      const r = 4 + Math.sqrt(rand()) * (GRASS_RADIUS - 5)
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.5 + rand() * 1.5, p: rand() * 100, s: 0.4 + rand() * 0.6 }
    })
  }, [count])
  const dummy = useMemo(() => new Object3D(), [])
  useFrame(({ clock }) => {
    if (!mesh.current) return
    const t = clock.elapsedTime
    flies.forEach((f, i) => {
      dummy.position.set(
        f.x + Math.sin(t * 0.3 * f.s + f.p) * 1.5,
        f.y + Math.sin(t * 0.8 + f.p) * 0.4,
        f.z + Math.cos(t * 0.25 * f.s + f.p) * 1.5,
      )
      const blink = Math.max(0, Math.sin(t * 2 * f.s + f.p))
      dummy.scale.setScalar(0.04 + blink * 0.05)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  if (!night) return null
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color={[4, 3.6, 1.2]} toneMapped={false} blending={AdditiveBlending} transparent depthWrite={false} />
    </instancedMesh>
  )
}

/** Leaves / petals gently drifting down around the player during the day. */
export function FallingLeaves({ count = 26 }) {
  const night = useStore((s) => s.night)
  const weather = useStore((s) => s.weather)
  const active = weather === 'blossom' ? count : weather === 'rain' ? 0 : Math.ceil(count / 3)
  const mesh = useRef()
  const leaves = useMemo(() => {
    const rand = rng(8)
    return Array.from({ length: count }, () => ({ x: 0, y: -1, z: 0, vy: 0, p: rand() * 10, rand }))
  }, [count])
  const dummy = useMemo(() => new Object3D(), [])
  useFrame(({ clock }, delta) => {
    if (!mesh.current) return
    const t = clock.elapsedTime
    const p = playerState.position
    const gust = weather === 'blossom' ? 1.5 + Math.sin(t * 0.4) * 1.2 : 0
    leaves.forEach((l, i) => {
      if (i >= active) {
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        mesh.current.setMatrixAt(i, dummy.matrix)
        return
      }
      l.x += gust * delta
      if (l.y < 0.05) {
        // respawn above, somewhere around the player
        l.x = p.x + (l.rand() - 0.5) * 24
        l.z = p.z + (l.rand() - 0.5) * 24
        l.y = 4 + l.rand() * 4
        l.vy = 0.35 + l.rand() * 0.35
      }
      l.y -= l.vy * delta
      dummy.position.set(l.x + Math.sin(t * 1.3 + l.p) * 0.6, l.y, l.z + Math.cos(t + l.p) * 0.4)
      dummy.rotation.set(t * 1.7 + l.p, t * 1.1 + l.p, Math.sin(t * 2 + l.p))
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  if (night) return null
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <circleGeometry args={[0.07, 5]} />
      <meshStandardMaterial color="#ffb7c8" side={2} />
    </instancedMesh>
  )
}

// Footprints that appear when walking on the sand and slowly fade away.
const MAX_PRINTS = 80
const dummyPrint = new Object3D()
export function Footprints() {
  const mesh = useRef()
  const prints = useRef(Array.from({ length: MAX_PRINTS }, () => ({ x: 0, z: 0, rot: 0, age: 99 })))
  const next = useRef(0)
  const last = useRef(new Vector3())
  const side = useRef(1)

  useFrame((_, delta) => {
    const p = playerState.position
    const walking = playerState.anim === 'walk' || playerState.anim === 'run'
    if (playerState.surface === 'sand' && walking && playerState.grounded && last.current.distanceTo(p) > 0.55) {
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
      dummyPrint.position.set(pr.x, 0.015, pr.z)
      dummyPrint.rotation.set(-Math.PI / 2, 0, pr.rot)
      dummyPrint.scale.set(s * 0.6, s, s)
      dummyPrint.updateMatrix()
      mesh.current.setMatrixAt(i, dummyPrint.matrix)
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

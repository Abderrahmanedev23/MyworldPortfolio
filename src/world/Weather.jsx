import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Object3D } from 'three'
import { playerState, useStore } from '../store'
import { audio } from '../audio'
import { spawnRipple } from './Particles'

const WEATHERS = [
  ['clear', 0.55],
  ['rain', 0.25],
  ['blossom', 0.2],
]

function forcedWeather() {
  const w = new URLSearchParams(window.location.search).get('weather')
  return ['clear', 'rain', 'blossom'].includes(w) ? w : null
}

/** Picks a new weather every few minutes (or uses ?weather=rain). */
export function WeatherController() {
  const setWeather = useStore((s) => s.setWeather)
  const setRainbow = useStore((s) => s.setRainbow)
  const weather = useStore((s) => s.weather)
  const rainbow = useStore((s) => s.rainbow)
  useEffect(() => {
    const forced = forcedWeather()
    if (forced) {
      setWeather(forced)
      return
    }
    let timer
    const next = () => {
      let r = Math.random()
      let w = 'clear'
      for (const [name, p] of WEATHERS) {
        if ((r -= p) <= 0) {
          w = name
          break
        }
      }
      setWeather(w)
      timer = setTimeout(next, (150 + Math.random() * 150) * 1000)
    }
    timer = setTimeout(next, 90_000) // start sunny, change after a bit
    return () => clearTimeout(timer)
  }, [setWeather])
  useEffect(() => audio.setRain(weather === 'rain'), [weather])
  useEffect(() => {
    if (!rainbow) return
    const t = setTimeout(() => setRainbow(false), 90_000)
    return () => clearTimeout(t)
  }, [rainbow, setRainbow])
  return null
}

const dummy = new Object3D()

/** Rain streaks in a box around the player, plus ripples on the sea. */
export function Rain() {
  const weather = useStore((s) => s.weather)
  const quality = useStore((s) => s.settings.quality)
  const count = quality === 'high' ? 1400 : quality === 'medium' ? 900 : 450
  const mesh = useRef()
  const drops = useMemo(
    () => Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * 36, y: Math.random() * 18, z: (Math.random() - 0.5) * 36, s: 0.8 + Math.random() * 0.5 })),
    [count],
  )
  const rippleTimer = useRef(0)
  useFrame((_, delta) => {
    if (!mesh.current) return
    const dt = Math.min(delta, 0.05)
    const p = playerState.position
    drops.forEach((d, i) => {
      d.y -= 14 * d.s * dt
      d.x += 1.2 * dt // a little wind
      if (d.y < -0.4) {
        d.y = 14 + Math.random() * 4
        d.x = (Math.random() - 0.5) * 36
        d.z = (Math.random() - 0.5) * 36
      }
      dummy.position.set(p.x + d.x, d.y, p.z + d.z)
      dummy.rotation.set(0, 0, 0.08)
      dummy.scale.set(1, d.s, 1)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    rippleTimer.current += dt
    if (rippleTimer.current > 0.06) {
      rippleTimer.current = 0
      const x = p.x + (Math.random() - 0.5) * 24
      const z = p.z + (Math.random() - 0.5) * 24
      if (Math.hypot(x, z) > 32.5) spawnRipple(x, z, 0.35, 0.7)
    }
  })
  if (weather !== 'rain') return null
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[0.015, 0.45, 0.015]} />
      <meshBasicMaterial color="#d6e6ff" transparent opacity={0.45} depthWrite={false} />
    </instancedMesh>
  )
}

const BANDS = ['#ff4d4d', '#ff9f43', '#ffe066', '#7bd389', '#4dabf7', '#5c7cfa', '#b197fc']

/** A soft rainbow over the sea after the rain stops. */
export function Rainbow() {
  const rainbow = useStore((s) => s.rainbow)
  const night = useStore((s) => s.night)
  const group = useRef()
  const fade = useRef(0)
  useFrame((_, delta) => {
    if (!group.current) return
    fade.current = Math.min(1, fade.current + delta * 0.25)
    group.current.children.forEach((m) => (m.material.opacity = 0.22 * fade.current))
  })
  useEffect(() => {
    fade.current = 0
  }, [rainbow])
  if (!rainbow || night) return null
  return (
    <group ref={group} position={[-20, -8, -120]} rotation={[0, 0.25, 0]}>
      {BANDS.map((c, i) => (
        <mesh key={c}>
          <torusGeometry args={[70 - i * 1.6, 0.8, 8, 96, Math.PI]} />
          <meshBasicMaterial color={c} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} fog={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

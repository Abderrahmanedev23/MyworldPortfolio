import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import {
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector3,
} from 'three'
import { useInteractable } from '../interaction'
import { getMoveInput } from '../input'
import { playerState, useStore } from '../store'
import { audio } from '../audio'
import { fish as SPECIES } from '../content'
import { spawnRipple, spawnSplash } from './Particles'
import { ISLAND_RADIUS } from './layout'

const WATER_Y = -0.32
const RARITY_WEIGHT = { 1: 50, 2: 20, 3: 8, 4: 3, 5: 1 }
const BITE_WINDOW = { 1: 0.95, 2: 0.85, 3: 0.72, 4: 0.62, 5: 0.52 }
const DOCK = { x0: 27.6, x1: 37.4, z: 1.4 }

const inDockArea = (x, z) => x > DOCK.x0 && x < DOCK.x1 && Math.abs(z) < DOCK.z

function pickSpecies() {
  const night = useStore.getState().night
  const weights = SPECIES.map((f) => RARITY_WEIGHT[f.rarity] * (f.night ? (night ? 3 : 0.25) : 1))
  let r = Math.random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < SPECIES.length; i++) {
    r -= weights[i]
    if (r <= 0) return SPECIES[i]
  }
  return SPECIES[0]
}

/** Where (and which way) the player can cast from right now, or null. */
function fishingSpot() {
  if (playerState.swimming || !playerState.grounded || playerState.sitAt) return null
  const p = playerState.position
  const r = Math.hypot(p.x, p.z)
  let dir
  if (p.x > 33.5 && Math.abs(p.z) < 1.1 && p.y > 0.6) {
    // end of the dock: cast in whichever open-water direction you're facing most
    const f = [Math.sin(playerState.facing), Math.cos(playerState.facing)]
    dir = [
      [1, 0],
      [0, 1],
      [0, -1],
    ].sort((a, b) => b[0] * f[0] + b[1] * f[1] - (a[0] * f[0] + a[1] * f[1]))[0]
  } else if (r > 29.6 && r < 32.3 && p.y < 1.3) {
    dir = [p.x / r, p.z / r] // from the beach: straight out to sea
  } else return null
  const dist = 4.4
  const target = [p.x + dir[0] * dist, p.z + dir[1] * dist]
  if (inDockArea(...target) || Math.hypot(...target) < ISLAND_RADIUS + 1.5) return null
  return { dir, target }
}

// ---------- fish shadow geometry (a body + tail silhouette, lying flat) ----------
function shadowGeometry() {
  const s = new Shape()
  s.absellipse(0, 0, 0.16, 0.42, 0, Math.PI * 2, false, 0)
  const tail = new Shape()
  tail.moveTo(0, -0.34)
  tail.lineTo(0.17, -0.62)
  tail.lineTo(-0.17, -0.62)
  tail.closePath()
  const g = new ShapeGeometry([s, tail], 12)
  g.rotateX(-Math.PI / 2) // lie flat, nose towards +z
  g.rotateY(Math.PI)
  return g
}

/** A little 3D fish for the catch animation, tinted per species. */
function makeFish(color) {
  const g = new Group()
  const mat = new MeshStandardMaterial({ color, roughness: 0.4 })
  const body = new Mesh(new SphereGeometry(0.16, 16, 12), mat)
  body.scale.set(0.7, 1, 2)
  const tail = new Mesh(new CylinderGeometry(0, 0.16, 0.22, 3), mat)
  tail.rotation.x = -Math.PI / 2
  tail.position.z = -0.4
  tail.scale.set(0.25, 1, 1)
  const eyeMat = new MeshStandardMaterial({ color: '#111' })
  for (const s of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.025, 8, 6), eyeMat)
    eye.position.set(s * 0.09, 0.04, 0.2)
    g.add(eye)
  }
  g.add(body, tail)
  return g
}

const dummy = new Object3D()
const tmp = new Vector3()
const tip = new Vector3()

/** Fish shadows wandering around the island. Shared with the fishing logic. */
const school = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2
  const r = 35 + Math.random() * 14
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: Math.random() * 6, speed: 0.4 + Math.random() * 0.5, size: 0.6 + Math.random() * 0.8, turn: 0 }
})

function FishShadows({ material, geometry }) {
  const mesh = useRef()
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = playerState.position
    school.forEach((f, i) => {
      const r = Math.hypot(f.x, f.z)
      f.turn += (Math.random() - 0.5) * dt * 2
      f.turn *= 0.98
      let h = f.h + f.turn * dt
      // stay in the ring of sea around the island, away from the dock
      const out = Math.atan2(f.x, f.z)
      const steer = (target) => (h += Math.atan2(Math.sin(target - h), Math.cos(target - h)) * dt * 1.5)
      if (r < 34.5) steer(out)
      if (r > 52) steer(out + Math.PI)
      if (inDockArea(f.x, f.z)) steer(f.z > 0 ? 0 : Math.PI)
      let speed = f.speed
      const dx = f.x - p.x
      const dz = f.z - p.z
      if (playerState.swimming && dx * dx + dz * dz < 9) {
        steer(Math.atan2(dx, dz))
        speed = 3
      }
      f.h = h
      f.x += Math.sin(h) * speed * dt
      f.z += Math.cos(h) * speed * dt
      dummy.position.set(f.x, WATER_Y + 0.015, f.z)
      dummy.rotation.set(0, h, 0)
      dummy.scale.setScalar(f.size)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[geometry, material, school.length]} frustumCulled={false} />
}

export function Fishing() {
  const setFishing = useStore((s) => s.setFishing)
  const fishingUI = useStore((s) => s.fishing)
  const geo = useMemo(shadowGeometry, [])
  const shadowMat = useMemo(() => new MeshStandardMaterial({ color: '#0e2a3d', transparent: true, opacity: 0.38, depthWrite: false, roughness: 1 }), [])
  const bobber = useRef()
  const hooked = useRef()
  const jumper = useRef()
  const line = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(16 * 3), 3))
    const l = new Line(g, new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }))
    l.frustumCulled = false
    l.visible = false
    return l
  }, [])
  const rod = useMemo(() => {
    const g = new Group()
    const pole = new Mesh(new CylinderGeometry(0.012, 0.03, 2.3, 6), new MeshStandardMaterial({ color: '#8a5a3b', roughness: 0.6 }))
    pole.position.y = 1.0
    const grip = new Mesh(new CylinderGeometry(0.045, 0.045, 0.35, 8), new MeshStandardMaterial({ color: '#2a2236' }))
    grip.position.y = -0.05
    const reel = new Mesh(new CylinderGeometry(0.07, 0.07, 0.05, 12), new MeshStandardMaterial({ color: '#c0c6cf', metalness: 0.6, roughness: 0.3 }))
    reel.rotation.z = Math.PI / 2
    reel.position.set(0.06, 0.15, 0)
    const tipMarker = new Object3D()
    tipMarker.position.y = 2.15
    g.add(pole, grip, reel, tipMarker)
    g.userData.tip = tipMarker
    g.visible = false
    return g
  }, [])
  const s = useRef({ phase: 'idle' }).current

  // attach the rod to the player's right hand once the model is ready
  useFrame(() => {
    if (rod.parent || !playerState.rig) return
    // GLTFLoader strips dots from node names: "handslot.r" → "handslotr"
    const hand = playerState.rig.getObjectByName('handslotr') ?? playerState.rig.getObjectByName('handslot.r')
    if (hand) hand.add(rod)
  })

  const end = (reason) => {
    if (reason === 'early') {
      audio.play('fail')
      useStore.getState().showToast({ title: 'Too early!', text: 'You scared the fish away. Wait for the big bite.', icon: '💨' })
    } else if (reason === 'missed') {
      audio.play('fail')
      useStore.getState().showToast({ title: 'It got away…', text: 'Press E as soon as the bobber goes under!', icon: '🎣' })
    }
    s.phase = 'idle'
    playerState.fishing = false
    playerState.fishAnim = null
    rod.visible = false
    line.visible = false
    bobber.current.visible = false
    hooked.current.visible = false
    jumper.current.visible = false
    setFishing(null)
  }

  const start = () => {
    const spot = fishingSpot()
    if (!spot || s.phase !== 'idle') return
    Object.assign(s, {
      phase: 'cast',
      t: 0,
      dir: spot.dir,
      target: new Vector3(spot.target[0], WATER_Y, spot.target[1]),
      from: new Vector3(),
      released: false,
      nibbleAt: undefined,
      species: pickSpecies(),
    })
    s.size = Math.round(s.species.size[0] + Math.random() * (s.species.size[1] - s.species.size[0]))
    playerState.fishing = true
    playerState.fishAnim = 'cast'
    playerState.facing = Math.atan2(spot.dir[0], spot.dir[1])
    rod.visible = true
    audio.play('cast')
    setFishing({ phase: 'cast' })
  }

  useInteractable('fishing-spot', {
    dynamic: () => (s.phase === 'idle' && fishingSpot() ? [playerState.position.x, playerState.position.y - 0.7, playerState.position.z] : null),
    radius: 1,
    bias: 1.4,
    label: 'Cast your line 🎣',
    promptHeight: 2.3,
    onInteract: start,
  })

  // E / tap during the minigame
  useEffect(() => {
    const press = () => {
      if (s.phase === 'bite') {
        s.phase = 'reel'
        s.t = 0
        playerState.fishAnim = 'reel'
        audio.play('reel')
        spawnSplash(s.target.x, s.target.z, 16, 1.1)
        jumper.current.clear()
        jumper.current.add(makeFish(s.species.color))
        const k = Math.min(1.8, Math.max(0.5, s.size / 40))
        jumper.current.scale.setScalar(k)
        jumper.current.visible = true
        hooked.current.visible = false
        bobber.current.visible = false
        line.visible = false
        setFishing({ phase: 'reel' })
      } else if (s.phase === 'caught') {
        audio.play('close')
        end()
      } else if (s.phase === 'wait' || s.phase === 'nibble') {
        end('early')
      }
    }
    const cancel = () => s.phase !== 'idle' && end()
    window.addEventListener('fish-press', press)
    window.addEventListener('fish-cancel', cancel)
    return () => {
      window.removeEventListener('fish-press', press)
      window.removeEventListener('fish-cancel', cancel)
    }
  })

  useFrame(({ clock }, delta) => {
    if (s.phase === 'idle') return
    const dt = Math.min(delta, 0.05)
    s.t += dt
    const now = clock.elapsedTime
    const b = bobber.current
    const p = playerState.position

    // walking away reels the line in
    if (s.phase !== 'caught' && s.phase !== 'reel' && getMoveInput().len > 0.3) return end()

    rod.userData.tip.getWorldPosition(tip)

    if (s.phase === 'cast') {
      if (s.t > 0.32) {
        const k = Math.min(1, (s.t - 0.32) / 0.55)
        if (!s.released) {
          s.released = true
          s.from.copy(tip)
        }
        b.visible = true
        b.position.lerpVectors(s.from, s.target, k)
        b.position.y += Math.sin(k * Math.PI) * 2.2
        if (k >= 1) {
          audio.play('plop')
          spawnRipple(s.target.x, s.target.z, 0.9, 1.4)
          s.phase = 'wait'
          s.t = 0
          playerState.fishAnim = 'wait'
          // the hooked fish appears a few metres away and swims over
          const a = Math.random() * Math.PI * 2
          s.fish = new Vector3(s.target.x + Math.cos(a) * 4.5, WATER_Y + 0.016, s.target.z + Math.sin(a) * 4.5)
          if (inDockArea(s.fish.x, s.fish.z) || Math.hypot(s.fish.x, s.fish.z) < ISLAND_RADIUS + 1) s.fish.set(s.target.x + s.dir[0] * 4.5, s.fish.y, s.target.z + s.dir[1] * 4.5)
          s.arriveIn = 2.5 + Math.random() * 4
          hooked.current.visible = true
          hooked.current.scale.setScalar(Math.min(2.6, Math.max(0.6, s.size / 35)))
          setFishing({ phase: 'wait' })
        }
      }
    } else if (s.phase === 'wait') {
      b.position.set(s.target.x, WATER_Y + Math.sin(now * 2.5) * 0.02, s.target.z)
      // fish swims towards the bobber in little bursts
      tmp.set(s.target.x, s.fish.y, s.target.z).sub(s.fish)
      const d = tmp.length()
      const burst = 0.4 + Math.max(0, Math.sin(now * 2.2)) * 1.2
      if (d > 0.45) s.fish.addScaledVector(tmp.normalize(), Math.min(d - 0.45, burst * dt * (d / Math.max(0.5, s.arriveIn - s.t + 0.5))))
      hooked.current.position.copy(s.fish)
      hooked.current.rotation.y = Math.atan2(tmp.x, tmp.z)
      if (s.t > s.arriveIn) {
        s.phase = 'nibble'
        s.t = 0
        s.nibbles = 1 + Math.floor(Math.random() * 3)
        s.nextNibble = 0.4
        setFishing({ phase: 'nibble' })
      }
    } else if (s.phase === 'nibble') {
      let dip = 0
      if (s.t > s.nextNibble) {
        if (s.nibbles <= 0) {
          s.phase = 'bite'
          s.t = 0
          audio.play('bite')
          spawnSplash(s.target.x, s.target.z, 10, 0.7)
          setFishing({ phase: 'bite' })
        } else {
          s.nibbles--
          s.nibbleAt = s.t
          s.nextNibble = s.t + 0.8 + Math.random() * 0.8
          audio.play('nibble')
          spawnRipple(s.target.x, s.target.z, 0.5, 0.8)
        }
      }
      if (s.nibbleAt !== undefined && s.t - s.nibbleAt < 0.18) dip = 0.07
      b.position.set(s.target.x, WATER_Y - dip + Math.sin(now * 2.5) * 0.02, s.target.z)
      hooked.current.position.copy(s.fish)
      hooked.current.position.x += Math.sin(now * 9) * 0.03
    } else if (s.phase === 'bite') {
      b.position.set(s.target.x, WATER_Y - 0.28, s.target.z)
      hooked.current.position.x = s.fish.x + Math.sin(now * 30) * 0.05
      if (s.t > BITE_WINDOW[s.species.rarity]) end('missed')
    } else if (s.phase === 'reel') {
      // the fish leaps out of the water and lands above the player's head
      const k = Math.min(1, s.t / 0.75)
      const from = s.target
      const to = tmp.set(p.x, p.y + 1.65, p.z)
      jumper.current.position.lerpVectors(from, to, k)
      jumper.current.position.y += Math.sin(k * Math.PI) * 2.5
      jumper.current.rotation.set(Math.sin(now * 14) * 0.5, now * 6, 0)
      if (k >= 1) {
        s.phase = 'caught'
        playerState.fishAnim = 'cheer'
        audio.play('catch')
        const st = useStore.getState()
        const isNew = st.addCatch(s.species, s.size)
        if (!st.achievements.includes('fishing')) setTimeout(() => useStore.getState().unlock('fishing'), 900)
        setFishing({ phase: 'caught', catch: { fish: s.species, size: s.size, isNew } })
      }
    } else if (s.phase === 'caught') {
      jumper.current.position.set(p.x, p.y + 1.65 + Math.sin(now * 3) * 0.05, p.z)
      jumper.current.rotation.set(0, playerState.facing + Math.PI / 2, Math.sin(now * 8) * 0.15)
    }

    // fishing line: rod tip → bobber with a little sag
    if (b.visible && (s.phase === 'cast' || s.phase === 'wait' || s.phase === 'nibble' || s.phase === 'bite')) {
      line.visible = true
      const arr = line.geometry.attributes.position.array
      const sag = s.phase === 'cast' ? 0 : s.phase === 'bite' ? 0.05 : 0.35
      for (let i = 0; i < 16; i++) {
        const k = i / 15
        arr[i * 3] = tip.x + (b.position.x - tip.x) * k
        arr[i * 3 + 1] = tip.y + (b.position.y - tip.y) * k - Math.sin(k * Math.PI) * sag
        arr[i * 3 + 2] = tip.z + (b.position.z - tip.z) * k
      }
      line.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <>
      <FishShadows material={shadowMat} geometry={geo} />
      <primitive object={line} />
      <group ref={bobber} visible={false}>
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#e63946" />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>
      <mesh ref={hooked} geometry={geo} material={shadowMat} visible={false} />
      <group ref={jumper} visible={false} />
      {fishingUI?.phase === 'bite' && (
        <Html position={[playerState.position.x, playerState.position.y + 1.6, playerState.position.z]} center zIndexRange={[40, 0]}>
          <div className="bite-alert">!</div>
        </Html>
      )}
    </>
  )
}

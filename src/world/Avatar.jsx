import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { MathUtils } from 'three'

const INK = '#2a2236'

// Procedural chibi "mini me", built from primitives so it works without any
// model files. Colours come from profile.json → avatar. To use a Blender /
// Mixamo model instead, replace this component with a useGLTF + useAnimations
// version that reads the same `state.anim` value.
export function Avatar({ colors, state, scale = 1, outline = false }) {
  const root = useRef()
  const body = useRef()
  const head = useRef()
  const eyes = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
  const phase = useRef(0)
  const blinkAt = useRef(2 + Math.random() * 3)

  useFrame(({ clock }, dt) => {
    const anim = state.anim
    const speed = anim === 'run' ? 14 : anim === 'walk' ? 9 : 0
    phase.current += dt * speed
    const t = clock.elapsedTime
    const k = 1 - Math.pow(0.0001, dt) // frame-rate independent lerp factor
    const swing = anim === 'run' ? 1.1 : anim === 'walk' ? 0.7 : 0
    const s = Math.sin(phase.current)

    let aL = -s * swing
    let aR = s * swing
    let aLz = 0.15
    let aRz = -0.15
    let lL = s * swing
    let lR = -s * swing
    let bob = speed ? Math.abs(Math.cos(phase.current)) * 0.06 : Math.sin(t * 2) * 0.012
    let lean = anim === 'run' ? 0.2 : anim === 'walk' ? 0.06 : 0
    let headTilt = 0

    if (anim === 'jump') {
      aL = -2.6
      aR = -2.6
      aLz = 0.4
      aRz = -0.4
      lL = 0.6
      lR = -0.3
      bob = 0
    } else if (anim === 'wave') {
      aR = -2.9
      aRz = -0.3 + Math.sin(t * 12) * 0.35
      headTilt = 0.15
    } else if (anim === 'sit') {
      lL = -1.5
      lR = -1.5
      aL = -0.4
      aR = -0.4
      bob = -0.28
      lean = -0.05
    }

    armL.current.rotation.x = MathUtils.lerp(armL.current.rotation.x, aL, k)
    armR.current.rotation.x = MathUtils.lerp(armR.current.rotation.x, aR, k)
    armL.current.rotation.z = MathUtils.lerp(armL.current.rotation.z, aLz, k)
    armR.current.rotation.z = MathUtils.lerp(armR.current.rotation.z, aRz, k)
    legL.current.rotation.x = MathUtils.lerp(legL.current.rotation.x, lL, k)
    legR.current.rotation.x = MathUtils.lerp(legR.current.rotation.x, lR, k)
    body.current.position.y = MathUtils.lerp(body.current.position.y, bob, k)
    body.current.rotation.x = MathUtils.lerp(body.current.rotation.x, lean, k)
    head.current.rotation.z = MathUtils.lerp(head.current.rotation.z, headTilt, k)
    head.current.rotation.x = Math.sin(t * 1.3) * 0.03

    // blink every few seconds
    if (t > blinkAt.current) blinkAt.current = t + 2.5 + Math.random() * 3
    const untilBlink = blinkAt.current - t
    eyes.current.scale.y = untilBlink < 0.12 ? 0.15 : 1

    // squash on landing, stretch on take-off
    let sy = 1
    const sinceLand = t - (state.landedAt ?? -9)
    const sinceJump = t - (state.jumpedAt ?? -9)
    if (sinceLand < 0.25) sy -= Math.sin((sinceLand / 0.25) * Math.PI) * 0.25 * (state.landImpact ?? 0.5)
    if (sinceJump < 0.22) sy += Math.sin((sinceJump / 0.22) * Math.PI) * 0.12
    root.current.scale.set(scale * (1 + (1 - sy) * 0.6), scale * sy, scale * (1 + (1 - sy) * 0.6))
  })

  const c = colors
  const line = (th = 0.02) => (outline ? <Outlines thickness={th} color={INK} /> : null)
  return (
    <group ref={root} scale={scale}>
      <group ref={body}>
        {/* legs (pivot at hips) */}
        {[
          [legL, -0.13],
          [legR, 0.13],
        ].map(([ref, x]) => (
          <group key={x} ref={ref} position={[x, 0.42, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.18, 6, 12]} />
              <meshStandardMaterial color={c.pants} roughness={0.8} />
              {line()}
            </mesh>
            <mesh position={[0, -0.35, 0.05]} scale={[1, 0.65, 1.35]} castShadow>
              <sphereGeometry args={[0.12, 16, 12]} />
              <meshStandardMaterial color={c.shoes} roughness={0.5} />
              {line()}
            </mesh>
          </group>
        ))}

        {/* hoodie torso */}
        <mesh position={[0, 0.66, 0]} scale={[1, 1, 0.9]} castShadow>
          <capsuleGeometry args={[0.27, 0.22, 8, 20]} />
          <meshStandardMaterial color={c.hoodie} roughness={0.85} />
          {line()}
        </mesh>
        {/* pocket + drawstrings */}
        <mesh position={[0, 0.55, 0.23]} rotation={[0.15, 0, 0]}>
          <capsuleGeometry args={[0.06, 0.2, 4, 10]} />
          <meshStandardMaterial color={c.hoodie} roughness={1} />
        </mesh>
        {[-0.06, 0.06].map((x) => (
          <mesh key={x} position={[x, 0.78, 0.245]}>
            <capsuleGeometry args={[0.012, 0.11, 2, 6]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        ))}
        {/* hood resting behind the neck */}
        <mesh position={[0, 0.9, -0.14]} rotation={[0.35, 0, 0]}>
          <torusGeometry args={[0.18, 0.075, 10, 20]} />
          <meshStandardMaterial color={c.hoodie} roughness={0.85} />
        </mesh>

        {/* arms (pivot at shoulders) */}
        {[
          [armL, -0.34],
          [armR, 0.34],
        ].map(([ref, x]) => (
          <group key={x} ref={ref} position={[x, 0.86, 0]}>
            <mesh position={[0, -0.18, 0]} castShadow>
              <capsuleGeometry args={[0.085, 0.2, 6, 12]} />
              <meshStandardMaterial color={c.hoodie} roughness={0.85} />
              {line()}
            </mesh>
            <mesh position={[0, -0.36, 0]}>
              <sphereGeometry args={[0.08, 14, 12]} />
              <meshStandardMaterial color={c.skin} roughness={0.7} />
              {line(0.015)}
            </mesh>
          </group>
        ))}

        {/* big chibi head */}
        <group ref={head} position={[0, 1.22, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.37, 32, 24]} />
            <meshStandardMaterial color={c.skin} roughness={0.7} />
            {line(0.022)}
          </mesh>
          {/* ears */}
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 0.36, -0.02, 0]} scale={[0.5, 1, 0.8]}>
              <sphereGeometry args={[0.08, 12, 10]} />
              <meshStandardMaterial color={c.skin} roughness={0.7} />
            </mesh>
          ))}
          {/* hair: cap + fluffy tufts */}
          <mesh position={[0, 0.08, -0.03]} scale={[1.07, 0.92, 1.07]} castShadow>
            <sphereGeometry args={[0.37, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshStandardMaterial color={c.hair} roughness={0.9} />
            {line()}
          </mesh>
          {[
            [0.12, 0.25, 0.25, 0.11],
            [-0.08, 0.27, 0.26, 0.12],
            [-0.24, 0.18, 0.2, 0.1],
            [0.26, 0.16, 0.18, 0.09],
            [0, 0.36, 0.05, 0.13],
            [0, 0.2, -0.32, 0.16],
          ].map(([x, y, z, r], i) => (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[r, 14, 12]} />
              <meshStandardMaterial color={c.hair} roughness={0.9} />
            </mesh>
          ))}
          {/* face */}
          <group ref={eyes} position={[0, -0.02, 0.33]}>
            {[-0.12, 0.12].map((x) => (
              <group key={x} position={[x, 0, 0]}>
                <mesh scale={[1, 1.25, 0.6]}>
                  <sphereGeometry args={[0.045, 14, 12]} />
                  <meshStandardMaterial color="#1b1b25" roughness={0.3} />
                </mesh>
                <mesh position={[0.015, 0.02, 0.03]}>
                  <sphereGeometry args={[0.013, 8, 6]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ))}
          </group>
          {/* little smile */}
          <mesh position={[0, -0.13, 0.335]} rotation={[0.25, 0, Math.PI]}>
            <torusGeometry args={[0.04, 0.009, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#7a3b3b" />
          </mesh>
          {/* blush */}
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, -0.1, 0.29]} scale={[1, 0.6, 0.4]}>
              <sphereGeometry args={[0.05, 10, 8]} />
              <meshStandardMaterial color="#ff8f9c" transparent opacity={0.55} />
            </mesh>
          ))}
          {c.glasses && (
            <group position={[0, -0.02, 0.36]}>
              {[-0.12, 0.12].map((x) => (
                <mesh key={x} position={[x, 0, 0]}>
                  <torusGeometry args={[0.08, 0.014, 8, 24]} />
                  <meshStandardMaterial color="#1d1d24" roughness={0.3} />
                </mesh>
              ))}
              <mesh>
                <boxGeometry args={[0.08, 0.014, 0.014]} />
                <meshStandardMaterial color="#1d1d24" />
              </mesh>
            </group>
          )}
        </group>
      </group>
    </group>
  )
}

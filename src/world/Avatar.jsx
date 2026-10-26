import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'

// Procedural chibi "mini me", built from primitives so it works without any
// model files. Colours come from profile.json → avatar. To use a Blender /
// Mixamo model instead, replace this component with a useGLTF + useAnimations
// version that reads the same `state.anim` value.
export function Avatar({ colors, state, scale = 1 }) {
  const root = useRef()
  const body = useRef()
  const head = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
  const phase = useRef(0)

  useFrame((_, dt) => {
    const anim = state.anim
    const speed = anim === 'run' ? 14 : anim === 'walk' ? 9 : 0
    phase.current += dt * speed
    const t = performance.now() / 1000
    const k = 1 - Math.pow(0.0001, dt) // frame-rate independent lerp factor
    const swing = anim === 'run' ? 1.1 : anim === 'walk' ? 0.7 : 0
    const s = Math.sin(phase.current)

    let aL = -s * swing
    let aR = s * swing
    let aLz = 0.12
    let aRz = -0.12
    let lL = s * swing
    let lR = -s * swing
    let bob = speed ? Math.abs(Math.cos(phase.current)) * 0.06 : Math.sin(t * 2) * 0.012
    let lean = anim === 'run' ? 0.18 : anim === 'walk' ? 0.06 : 0
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
  })

  const c = colors
  return (
    <group ref={root} scale={scale}>
      <group ref={body}>
        {/* legs (pivot at hips) */}
        <group ref={legL} position={[-0.13, 0.42, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <capsuleGeometry args={[0.1, 0.2, 4, 8]} />
            <meshStandardMaterial color={c.pants} />
          </mesh>
          <mesh position={[0, -0.36, 0.04]} castShadow>
            <boxGeometry args={[0.18, 0.1, 0.26]} />
            <meshStandardMaterial color={c.shoes} />
          </mesh>
        </group>
        <group ref={legR} position={[0.13, 0.42, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <capsuleGeometry args={[0.1, 0.2, 4, 8]} />
            <meshStandardMaterial color={c.pants} />
          </mesh>
          <mesh position={[0, -0.36, 0.04]} castShadow>
            <boxGeometry args={[0.18, 0.1, 0.26]} />
            <meshStandardMaterial color={c.shoes} />
          </mesh>
        </group>

        {/* hoodie torso */}
        <mesh position={[0, 0.66, 0]} castShadow>
          <capsuleGeometry args={[0.26, 0.24, 6, 12]} />
          <meshStandardMaterial color={c.hoodie} />
        </mesh>
        {/* hoodie pocket + strings */}
        <mesh position={[0, 0.56, 0.24]}>
          <boxGeometry args={[0.3, 0.12, 0.04]} />
          <meshStandardMaterial color={c.hoodie} roughness={1} />
        </mesh>
        <mesh position={[-0.06, 0.78, 0.25]}>
          <cylinderGeometry args={[0.012, 0.012, 0.14]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.06, 0.78, 0.25]}>
          <cylinderGeometry args={[0.012, 0.012, 0.14]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        {/* hood behind the neck */}
        <mesh position={[0, 0.92, -0.14]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.18, 0.07, 8, 16]} />
          <meshStandardMaterial color={c.hoodie} />
        </mesh>

        {/* arms (pivot at shoulders) */}
        <group ref={armL} position={[-0.33, 0.86, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.24, 4, 8]} />
            <meshStandardMaterial color={c.hoodie} />
          </mesh>
          <mesh position={[0, -0.4, 0]}>
            <sphereGeometry args={[0.075, 10, 10]} />
            <meshStandardMaterial color={c.skin} />
          </mesh>
        </group>
        <group ref={armR} position={[0.33, 0.86, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.24, 4, 8]} />
            <meshStandardMaterial color={c.hoodie} />
          </mesh>
          <mesh position={[0, -0.4, 0]}>
            <sphereGeometry args={[0.075, 10, 10]} />
            <meshStandardMaterial color={c.skin} />
          </mesh>
        </group>

        {/* big chibi head */}
        <group ref={head} position={[0, 1.22, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.36, 24, 20]} />
            <meshStandardMaterial color={c.skin} />
          </mesh>
          {/* hair cap + fringe */}
          <mesh position={[0, 0.07, -0.03]} scale={[1.06, 0.9, 1.06]} castShadow>
            <sphereGeometry args={[0.36, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshStandardMaterial color={c.hair} roughness={0.9} />
          </mesh>
          <mesh position={[0.05, 0.22, 0.24]} rotation={[0.9, 0, -0.3]}>
            <coneGeometry args={[0.12, 0.2, 6]} />
            <meshStandardMaterial color={c.hair} />
          </mesh>
          <mesh position={[-0.12, 0.2, 0.24]} rotation={[0.9, 0, 0.4]}>
            <coneGeometry args={[0.1, 0.18, 6]} />
            <meshStandardMaterial color={c.hair} />
          </mesh>
          {/* eyes */}
          <mesh position={[-0.12, -0.02, 0.32]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial color="#1b1b1b" />
          </mesh>
          <mesh position={[0.12, -0.02, 0.32]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial color="#1b1b1b" />
          </mesh>
          {/* blush */}
          <mesh position={[-0.2, -0.1, 0.28]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#ff9a9a" transparent opacity={0.6} />
          </mesh>
          <mesh position={[0.2, -0.1, 0.28]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#ff9a9a" transparent opacity={0.6} />
          </mesh>
          {c.glasses && (
            <group position={[0, -0.02, 0.35]}>
              <mesh position={[-0.12, 0, 0]}>
                <torusGeometry args={[0.08, 0.014, 6, 20]} />
                <meshStandardMaterial color="#111" />
              </mesh>
              <mesh position={[0.12, 0, 0]}>
                <torusGeometry args={[0.08, 0.014, 6, 20]} />
                <meshStandardMaterial color="#111" />
              </mesh>
              <mesh>
                <boxGeometry args={[0.08, 0.014, 0.014]} />
                <meshStandardMaterial color="#111" />
              </mesh>
            </group>
          )}
        </group>
      </group>
    </group>
  )
}

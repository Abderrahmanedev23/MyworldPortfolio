import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  N8AO,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { NeutralToneMapping, NoToneMapping } from 'three'
import { useStore } from '../store'

// Post-processing stack for the cozy look: soft contact shadows (AO), a gentle
// bloom on lamps / crystals / fireflies, neutral tone mapping, a touch of extra
// saturation and a vignette. Disabled on the "low" preset.
export function Effects() {
  const quality = useStore((s) => s.settings.quality)
  const blur = useStore((s) => !!s.menu)
  const gl = useThree((s) => s.gl)
  const enabled = quality !== 'low'

  useEffect(() => {
    // with the composer, tone mapping happens in the effect pass instead
    gl.toneMapping = enabled ? NoToneMapping : NeutralToneMapping
    gl.toneMappingExposure = 1.05
  }, [gl, enabled])

  if (!enabled) return null
  const high = quality === 'high'
  return (
    <EffectComposer multisampling={high ? 4 : 0} enableNormalPass={false}>
      {high ? <N8AO halfRes aoRadius={1.6} intensity={2.4} distanceFalloff={1.2} color="#1d2b25" /> : <></>}
      <Bloom mipmapBlur luminanceThreshold={0.82} luminanceSmoothing={0.2} intensity={0.55} radius={0.65} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <HueSaturation saturation={0.04} />
      <BrightnessContrast brightness={-0.01} contrast={0.06} />
      <Vignette offset={0.28} darkness={blur ? 0.75 : 0.42} />
    </EffectComposer>
  )
}

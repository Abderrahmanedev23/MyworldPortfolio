import { Vector3 } from 'three'

// "X-ray" cutout: fragments of patched materials that sit between the camera
// and the player are discarded with a dither pattern, so trees and buildings
// never hide the character. CameraRig updates the uniforms every frame.
export const occlusionUniforms = {
  uOccCam: { value: new Vector3() },
  uOccTarget: { value: new Vector3() },
  uOccRadius: { value: 1.6 },
}

export function patchOcclusion(material) {
  if (!material || material.userData.occlusion) return
  material.userData.occlusion = true
  material.customProgramCacheKey = () => 'occlusion'
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, occlusionUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOccWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 occWp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          occWp = instanceMatrix * occWp;
        #endif
        vOccWorld = (modelMatrix * occWp).xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vOccWorld;
        uniform vec3 uOccCam;
        uniform vec3 uOccTarget;
        uniform float uOccRadius;`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        {
          vec3 seg = uOccTarget - uOccCam;
          float t = clamp(dot(vOccWorld - uOccCam, seg) / dot(seg, seg), 0.0, 1.0);
          float d = distance(vOccWorld, uOccCam + seg * t);
          float r = uOccRadius * smoothstep(0.0, 0.25, t) * (1.0 - smoothstep(0.85, 1.0, t));
          float fade = 1.0 - smoothstep(r * 0.6, r, d);
          float dither = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
          if (fade > dither) discard;
        }`,
      )
  }
}

/** Ref callback for JSX materials: <meshStandardMaterial ref={occlude} /> */
export const occlude = (m) => m && patchOcclusion(m)

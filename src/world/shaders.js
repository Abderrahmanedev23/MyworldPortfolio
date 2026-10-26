import { MeshStandardMaterial, Vector3 } from 'three'

// Shared uniforms for every patched material, updated once per frame by <ShaderClock />.
export const uniforms = {
  uTime: { value: 0 },
  uPlayer: { value: new Vector3() },
  uOccCam: { value: new Vector3() },
  uOccTarget: { value: new Vector3() },
  uOccRadius: { value: 1.6 },
  uNight: { value: 0 },
}

const NOISE = /* glsl */ `
  float cozyHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float cozyNoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(cozyHash(i), cozyHash(i + vec2(1, 0)), u.x),
               mix(cozyHash(i + vec2(0, 1)), cozyHash(i + vec2(1, 1)), u.x), u.y);
  }
`

const HEADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uPlayer;
  uniform vec3 uOccCam;
  uniform vec3 uOccTarget;
  uniform float uOccRadius;
  uniform float uNight;
  varying vec3 vWorldP;
  ${NOISE}
`

const INSTANCE_ORIGIN = /* glsl */ `
  vec4 cozyOrigin = vec4(0.0, 0.0, 0.0, 1.0);
  #ifdef USE_INSTANCING
    cozyOrigin = instanceMatrix * cozyOrigin;
  #endif
  cozyOrigin = modelMatrix * cozyOrigin;
`

// Vertex-stage snippets, inserted after <begin_vertex> (they edit `transformed`).
const VERTEX = {
  // gentle sway, stronger higher up the mesh
  wind: (amount = 0.05) => /* glsl */ `
    {
      ${INSTANCE_ORIGIN}
      float h = max(position.y + 0.5, 0.0);
      transformed.x += sin(uTime * 1.6 + cozyOrigin.x * 0.45 + cozyOrigin.z * 0.3) * h * ${amount.toFixed(3)};
      transformed.z += cos(uTime * 1.25 + cozyOrigin.z * 0.5) * h * ${(amount * 0.6).toFixed(3)};
    }`,
  // grass blades: wind gusts + bend away from the player
  grass: () => /* glsl */ `
    {
      ${INSTANCE_ORIGIN}
      float bend = uv.y * uv.y;
      float gust = cozyNoise(cozyOrigin.xz * 0.12 + vec2(uTime * 0.35, uTime * 0.2));
      float sway = sin(uTime * 2.2 + cozyOrigin.x * 0.7 + cozyOrigin.z * 0.4) * 0.12 + gust * 0.35;
      transformed.x += sway * bend;
      transformed.z += sway * 0.5 * bend;
      vec2 away = cozyOrigin.xz - uPlayer.xz;
      float d = length(away);
      float push = (1.0 - smoothstep(0.25, 1.1, d)) * step(abs(uPlayer.y - 0.7 - cozyOrigin.y), 0.8);
      vec2 dir = d > 0.001 ? away / d : vec2(0.0);
      transformed.xz += dir * push * 0.45 * bend;
      transformed.y -= push * 0.25 * bend;
    }`,
}

// Fragment-stage snippets, inserted after <color_fragment> (they edit `diffuseColor`).
const FRAGMENT = {
  // painterly two-tone variation on big flat surfaces
  tint: (strength = 0.12) => /* glsl */ `
    {
      float n = cozyNoise(vWorldP.xz * 0.18) * 0.65 + cozyNoise(vWorldP.xz * 0.9) * 0.35;
      diffuseColor.rgb *= 1.0 + (n - 0.5) * ${(strength * 2).toFixed(3)};
    }`,
  water: () => /* glsl */ `
    {
      float r = length(vWorldP.xz);
      vec3 shallow = vec3(0.36, 0.78, 0.76);
      vec3 mid = vec3(0.16, 0.56, 0.72);
      vec3 deep = vec3(0.09, 0.32, 0.55);
      vec3 col = mix(shallow, mid, smoothstep(32.0, 40.0, r));
      col = mix(col, deep, smoothstep(40.0, 85.0, r));
      // shallows + foam around the little treasure islet
      float ri = length(vWorldP.xz - vec2(-46.0, -44.0));
      col = mix(shallow, col, smoothstep(6.5, 12.0, ri));
      // drifting caustic-like streaks
      float n = cozyNoise(vWorldP.xz * 0.35 + vec2(uTime * 0.12, uTime * 0.05));
      float n2 = cozyNoise(vWorldP.xz * 0.8 - vec2(uTime * 0.1, 0.0));
      col += smoothstep(0.62, 0.8, n * 0.6 + n2 * 0.4) * 0.08;
      // shore foam: rolling bands that fade out from the beach
      float shore = r - 32.0;
      float band = sin(shore * 3.2 - uTime * 1.8 + n * 3.0) * 0.5 + 0.5;
      float foam = smoothstep(0.75, 0.95, band) * (1.0 - smoothstep(0.0, 4.5, shore));
      foam += 1.0 - smoothstep(-0.2, 0.7, shore);
      col = mix(col, vec3(0.97, 1.0, 1.0), clamp(foam, 0.0, 1.0) * 0.85);
      // sun glints: tiny round sparkles that pop in and out
      vec2 gc = vWorldP.xz * 5.0;
      float gh = cozyHash(floor(gc) + floor(uTime * 1.5));
      float gd = length(fract(gc) - 0.5);
      float glint = step(0.993, gh) * (1.0 - smoothstep(0.05, 0.2, gd));
      col += glint * 0.6 * (1.0 - uNight);
      diffuseColor.rgb = col;
    }`,
  // x-ray cutout between camera and player (dithered)
  occlusion: () => /* glsl */ `
    if (uOccRadius > 0.01) {
      vec3 seg = uOccTarget - uOccCam;
      float t = clamp(dot(vWorldP - uOccCam, seg) / dot(seg, seg), 0.0, 1.0);
      float d = distance(vWorldP, uOccCam + seg * t);
      float r = uOccRadius * smoothstep(0.0, 0.25, t) * (1.0 - smoothstep(0.85, 1.0, t));
      float fade = 1.0 - smoothstep(r * 0.6, r, d);
      if (fade > cozyHash(floor(gl_FragCoord.xy))) discard;
    }`,
}

/**
 * Patch a MeshStandardMaterial with cozy shader features.
 * features: { wind?: number, grass?: true, tint?: number, water?: true, occlusion?: true, flatUp?: true }
 */
export function patchMaterial(material, features) {
  if (!material || material.userData.cozy) return material
  material.userData.cozy = features
  const key = JSON.stringify(features)
  material.customProgramCacheKey = () => key
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    let vert = ''
    if (features.wind) vert += VERTEX.wind(features.wind)
    if (features.grass) vert += VERTEX.grass()
    let frag = ''
    if (features.tint) frag += FRAGMENT.tint(features.tint)
    if (features.water) frag += FRAGMENT.water()
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${HEADER}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vert}`)
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec4 wp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wp = instanceMatrix * wp;
          #endif
          vWorldP = (modelMatrix * wp).xyz;
        }`,
      )
    if (features.flatUp) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nobjectNormal = vec3(0.0, 1.0, 0.0);',
      )
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${HEADER}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${frag}`)
    if (features.occlusion) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>\n${FRAGMENT.occlusion()}`,
      )
    }
  }
  material.needsUpdate = true
  return material
}

export function cozyMaterial(params, features) {
  return patchMaterial(new MeshStandardMaterial(params), features)
}

/** Ref callback for JSX materials that should get the x-ray cutout. */
export const occlude = (m) => m && patchMaterial(m, { occlusion: true })

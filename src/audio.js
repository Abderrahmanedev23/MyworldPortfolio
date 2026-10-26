// All sound is synthesised with the Web Audio API — no audio files to download.
// audio.init() must be called from a user gesture (the "Start" button does it).

let ctx = null
let master, musicBus, sfxBus, ambienceBus
let noise = null
let musicTimer = null
let chirpTimer = null
let night = false
let rainGain = null
let rainWanted = false
let volumes = { music: 0.45, sfx: 0.8, muted: false }

const now = () => ctx.currentTime

function makeNoise() {
  const len = ctx.sampleRate
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function env(gainNode, t, attack, peak, decay) {
  gainNode.gain.setValueAtTime(0.0001, t)
  gainNode.gain.exponentialRampToValueAtTime(peak, t + attack)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

function tone({ freq, type = 'sine', t = now(), attack = 0.005, decay = 0.2, gain = 0.2, to = null, bus = sfxBus, detune = 0 }) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.detune.value = detune
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + decay)
  env(g, t, attack, gain, decay)
  o.connect(g).connect(bus)
  o.start(t)
  o.stop(t + attack + decay + 0.05)
}

function burst({ t = now(), dur = 0.08, gain = 0.2, type = 'bandpass', freq = 1200, q = 1, bus = sfxBus, sweepTo = null }) {
  const src = ctx.createBufferSource()
  src.buffer = noise
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.setValueAtTime(freq, t)
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur)
  f.Q.value = q
  const g = ctx.createGain()
  env(g, t, 0.004, gain, dur)
  src.connect(f).connect(g).connect(bus)
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.05)
}

// ---------- ambience ----------
function startAmbience() {
  // brown-ish noise → lowpass → slow swell = waves
  const len = ctx.sampleRate * 4
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    d[i] = last * 3.5
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 520
  const swell = ctx.createGain()
  swell.gain.value = 0.22
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.11
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.16
  lfo.connect(lfoGain).connect(swell.gain)
  src.connect(lp).connect(swell).connect(ambienceBus)
  src.start()
  lfo.start()

  clearInterval(chirpTimer)
  chirpTimer = setInterval(() => {
    if (night) {
      // crickets
      if (Math.random() < 0.5) for (let i = 0; i < 3; i++) tone({ freq: 4200, type: 'square', t: now() + i * 0.07, decay: 0.03, gain: 0.006, bus: ambienceBus })
      return
    }
    if (Math.random() < 0.3) {
      const base = 2200 + Math.random() * 1600
      tone({ freq: base, to: base * 1.4, decay: 0.12, gain: 0.03, bus: ambienceBus })
      if (Math.random() < 0.5) tone({ freq: base * 1.1, to: base * 0.9, t: now() + 0.16, decay: 0.12, gain: 0.025, bus: ambienceBus })
    }
  }, 1400)
}

// ---------- music: a gentle generative lo-fi loop ----------
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12)
const CHORDS = [
  [53, 57, 60, 64], // Fmaj7
  [52, 55, 59, 62], // Em7
  [50, 53, 57, 60], // Dm7
  [48, 52, 55, 59], // Cmaj7
]
const SCALE = [60, 62, 64, 67, 69, 72, 74, 76] // C major pentatonic-ish
let step = 0
let nextTime = 0
let melodyIdx = 3

function scheduleMusic() {
  const beat = night ? 0.85 : 0.7 // seconds per beat
  while (nextTime < now() + 0.3) {
    const t = nextTime
    const bar = Math.floor(step / 8) % CHORDS.length
    const chord = CHORDS[bar]
    const eighth = step % 8
    if (eighth === 0) {
      // soft pad
      chord.forEach((n, i) =>
        tone({ freq: midi(n), type: 'triangle', t, attack: 0.4, decay: beat * 3.6, gain: 0.035, bus: musicBus, detune: i % 2 ? 6 : -6 }),
      )
      tone({ freq: midi(chord[0] - 12), type: 'sine', t, attack: 0.02, decay: beat * 1.8, gain: 0.12, bus: musicBus })
    }
    if (eighth === 4) tone({ freq: midi(chord[0] - 12 + 7), type: 'sine', t, attack: 0.02, decay: beat * 1.6, gain: 0.08, bus: musicBus })
    // plucky melody, a little random walk on the scale
    if (Math.random() < (night ? 0.3 : 0.55)) {
      melodyIdx = Math.max(0, Math.min(SCALE.length - 1, melodyIdx + Math.round((Math.random() - 0.5) * 3)))
      const n = SCALE[melodyIdx] + (night ? -12 : 0)
      tone({ freq: midi(n), type: 'sine', t, attack: 0.005, decay: 0.45, gain: 0.07, bus: musicBus })
      tone({ freq: midi(n + 12), type: 'triangle', t, attack: 0.005, decay: 0.15, gain: 0.015, bus: musicBus })
    }
    // brushed hi-hat
    if (!night && eighth % 2 === 1) burst({ t, dur: 0.03, gain: 0.02, type: 'highpass', freq: 7000, bus: musicBus })
    step++
    nextTime += beat / 2
  }
}

function applyVolumes() {
  if (!ctx) return
  const t = now()
  master.gain.setTargetAtTime(volumes.muted ? 0 : 1, t, 0.1)
  musicBus.gain.setTargetAtTime(volumes.music * 0.9, t, 0.1)
  sfxBus.gain.setTargetAtTime(volumes.sfx, t, 0.1)
  ambienceBus.gain.setTargetAtTime(volumes.sfx * 0.8, t, 0.1)
}

export const audio = {
  init() {
    if (ctx) {
      ctx.resume()
      return
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    const comp = ctx.createDynamicsCompressor()
    master.connect(comp).connect(ctx.destination)
    musicBus = ctx.createGain()
    sfxBus = ctx.createGain()
    ambienceBus = ctx.createGain()
    ;[musicBus, sfxBus, ambienceBus].forEach((b) => b.connect(master))
    noise = makeNoise()
    applyVolumes()
    startAmbience()
    nextTime = now() + 0.2
    musicTimer = setInterval(scheduleMusic, 100)
    if (rainWanted) this.setRain(true)
  },
  setVolumes(v) {
    volumes = { ...volumes, ...v }
    applyVolumes()
  },
  setNight(v) {
    night = v
  },
  /** Soft rain loop, faded in and out. */
  setRain(on) {
    rainWanted = on
    if (!ctx) return
    if (!rainGain) {
      const src = ctx.createBufferSource()
      src.buffer = noise
      src.loop = true
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 900
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 6000
      rainGain = ctx.createGain()
      rainGain.gain.value = 0
      src.connect(hp).connect(lp).connect(rainGain).connect(ambienceBus)
      src.start()
    }
    rainGain.gain.setTargetAtTime(on ? 0.22 : 0, now(), 1.5)
  },
  get ready() {
    return !!ctx && ctx.state === 'running'
  },
  play(name, opts = {}) {
    if (!ctx || ctx.state !== 'running') return
    const t = now()
    switch (name) {
      case 'step': {
        const s = opts.surface
        if (s === 'wood') {
          burst({ dur: 0.06, gain: 0.25, type: 'lowpass', freq: 600 })
          tone({ freq: 150 + Math.random() * 30, decay: 0.07, gain: 0.12 })
        } else if (s === 'sand') burst({ dur: 0.09, gain: 0.14, type: 'highpass', freq: 2800 + Math.random() * 800 })
        else if (s === 'stone') burst({ dur: 0.04, gain: 0.16, type: 'bandpass', freq: 2500, q: 2 })
        else burst({ dur: 0.07, gain: 0.12, type: 'bandpass', freq: 900 + Math.random() * 500, q: 0.7 })
        break
      }
      case 'jump':
        tone({ freq: 280, to: 620, decay: 0.12, gain: 0.08, type: 'triangle' })
        break
      case 'land':
        burst({ dur: 0.12, gain: 0.25, type: 'lowpass', freq: 500 })
        tone({ freq: 90, decay: 0.1, gain: 0.15 })
        break
      case 'prompt':
        tone({ freq: 880, decay: 0.06, gain: 0.05 })
        break
      case 'open':
        tone({ freq: 660, decay: 0.08, gain: 0.08, type: 'triangle' })
        tone({ freq: 990, t: t + 0.07, decay: 0.12, gain: 0.08, type: 'triangle' })
        break
      case 'close':
        tone({ freq: 880, decay: 0.07, gain: 0.07, type: 'triangle' })
        tone({ freq: 587, t: t + 0.06, decay: 0.1, gain: 0.07, type: 'triangle' })
        break
      case 'click':
        tone({ freq: 1200, decay: 0.03, gain: 0.05 })
        break
      case 'blip': {
        // Animal Crossing-style babble: one blip per character
        const base = opts.pitch ?? 520
        tone({ freq: base * (0.85 + Math.random() * 0.35), type: 'square', decay: 0.045, gain: 0.025 })
        break
      }
      case 'achievement':
        ;[72, 76, 79, 84].forEach((n, i) => tone({ freq: midi(n), t: t + i * 0.09, decay: 0.35, gain: 0.09, type: 'triangle' }))
        tone({ freq: midi(96), t: t + 0.36, decay: 0.6, gain: 0.03 })
        break
      case 'splash':
        burst({ dur: 0.5, gain: 0.35, type: 'lowpass', freq: 3000, sweepTo: 300 })
        break
      case 'kick':
        tone({ freq: 160, to: 60, decay: 0.12, gain: 0.25 })
        break
      case 'bloop':
        tone({ freq: 300, to: 900, decay: 0.15, gain: 0.12 })
        break
      case 'stroke':
        burst({ dur: 0.22, gain: 0.14, type: 'lowpass', freq: 1400, sweepTo: 400 })
        break
      case 'gull': {
        // "kee-ow": a squawky falling cry
        const f = 1300 + Math.random() * 300
        for (let i = 0; i < (Math.random() < 0.5 ? 2 : 3); i++) {
          const t0 = t + i * 0.22
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          const bp = ctx.createBiquadFilter()
          bp.type = 'bandpass'
          bp.frequency.value = 1800
          bp.Q.value = 2
          o.type = 'sawtooth'
          o.frequency.setValueAtTime(f, t0)
          o.frequency.exponentialRampToValueAtTime(f * 0.55, t0 + 0.18)
          env(g, t0, 0.01, (opts.gain ?? 0.05) * (i ? 0.7 : 1), 0.18)
          o.connect(bp).connect(g).connect(ambienceBus)
          o.start(t0)
          o.stop(t0 + 0.25)
        }
        break
      }
      case 'cast':
        burst({ dur: 0.35, gain: 0.18, type: 'bandpass', freq: 1800, sweepTo: 600, q: 1.2 })
        tone({ freq: 900, to: 400, t: t + 0.05, decay: 0.3, gain: 0.03 })
        break
      case 'plop':
        tone({ freq: 500, to: 180, decay: 0.12, gain: 0.18 })
        burst({ t: t + 0.02, dur: 0.15, gain: 0.08, type: 'lowpass', freq: 1500 })
        break
      case 'nibble':
        tone({ freq: 380, to: 260, decay: 0.07, gain: 0.08 })
        break
      case 'bite':
        burst({ dur: 0.3, gain: 0.3, type: 'lowpass', freq: 2500, sweepTo: 500 })
        tone({ freq: 1320, decay: 0.12, gain: 0.08, type: 'square' })
        break
      case 'reel':
        for (let i = 0; i < 6; i++) tone({ freq: 2200 + i * 80, t: t + i * 0.05, decay: 0.025, gain: 0.03, type: 'square' })
        break
      case 'catch':
        ;[67, 72, 76, 79, 84].forEach((n, i) => tone({ freq: midi(n), t: t + i * 0.08, decay: 0.3, gain: 0.08, type: 'triangle' }))
        burst({ t, dur: 0.4, gain: 0.2, type: 'lowpass', freq: 3000, sweepTo: 600 })
        break
      case 'fail':
        ;[64, 60, 55].forEach((n, i) => tone({ freq: midi(n), t: t + i * 0.12, decay: 0.2, gain: 0.07, type: 'triangle' }))
        break
      case 'shutter':
        burst({ dur: 0.05, gain: 0.25, type: 'highpass', freq: 3000 })
        burst({ t: t + 0.07, dur: 0.06, gain: 0.2, type: 'highpass', freq: 2500 })
        break
      case 'dolphin':
        tone({ freq: 2400, to: 3600, decay: 0.12, gain: 0.03 })
        tone({ freq: 3000, to: 2200, t: t + 0.13, decay: 0.1, gain: 0.025 })
        break
      case 'oar':
        burst({ dur: 0.3, gain: 0.12, type: 'lowpass', freq: 1100, sweepTo: 350 })
        break
      case 'chest':
        tone({ freq: 220, to: 140, decay: 0.2, gain: 0.12, type: 'triangle' })
        ;[72, 76, 79, 83, 86].forEach((n, i) => tone({ freq: midi(n), t: t + 0.2 + i * 0.07, decay: 0.4, gain: 0.07, type: 'triangle' }))
        break
      case 'whoosh':
        burst({ dur: 0.45, gain: 0.2, type: 'bandpass', freq: 400, sweepTo: 2400, q: 0.8 })
        break
      default:
        break
    }
  },
}

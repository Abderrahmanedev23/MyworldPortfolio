// Ambient soundscape generated with the Web Audio API (no audio files):
// soft ocean waves plus the occasional bird chirp during the day.
let ctx = null
let master = null
let chirpTimer = null

function noiseBuffer(ac) {
  const len = ac.sampleRate * 4
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    // brown noise
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.5
  }
  return buf
}

function chirp() {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  const base = 2200 + Math.random() * 1800
  osc.frequency.setValueAtTime(base, t)
  osc.frequency.exponentialRampToValueAtTime(base * 1.4, t + 0.06)
  osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.12)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.04, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15)
  osc.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + 0.2)
}

export function startAmbient({ night }) {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx)
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 500
    const waveGain = ctx.createGain()
    waveGain.gain.value = 0.25
    // slow swell, like waves rolling in
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.12
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.18
    lfo.connect(lfoGain).connect(waveGain.gain)
    src.connect(filter).connect(waveGain).connect(master)
    src.start()
    lfo.start()
  }
  ctx.resume()
  master.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 1.5)
  clearInterval(chirpTimer)
  if (!night) {
    chirpTimer = setInterval(() => {
      if (Math.random() < 0.35) {
        chirp()
        if (Math.random() < 0.5) setTimeout(chirp, 160)
      }
    }, 1500)
  }
}

export function stopAmbient() {
  clearInterval(chirpTimer)
  if (!ctx) return
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
}

import { create } from 'zustand'
import { Vector3 } from 'three'
import { secrets } from './content'

const SAVE_KEY = 'myworld-achievements'
const ZONES = ['about', 'projects', 'skills', 'experience', 'contact']

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private mode etc.) — progress just won't persist
  }
}

export const isTouch =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

// Mutable, per-frame state shared between the player, camera and world.
// Kept outside React state so we don't re-render 60 times per second.
export const playerState = {
  position: new Vector3(0, 1, 4),
  velocity: new Vector3(),
  anim: 'idle', // idle | walk | run | jump | wave | sit
  facing: 0,
  sitAt: null, // { position: Vector3, rotation: number } while sitting
  respawn: false,
}

export const useStore = create((set, get) => ({
  started: false,
  start: () => set({ started: true }),

  quality: isTouch ? 'low' : 'high',
  setQuality: (quality) => set({ quality }),

  ready: false,
  setReady: () => set({ ready: true }),

  indoors: false,
  setIndoors: (indoors) => set({ indoors }),

  night: false,
  setNight: (night) => set({ night }),

  sound: false,
  setSound: (sound) => set({ sound }),

  // nearest interactable in range: { id, label, position, focus }
  nearby: null,
  setNearby: (nearby) => set({ nearby }),

  // content panel: { kind, data, focus }
  panel: null,
  openPanel: (panel) => {
    set({ panel })
    if (ZONES.includes(panel.kind)) get().visitZone(panel.kind)
  },
  closePanel: () => set({ panel: null }),

  // NPC speech bubble: { id, text }
  speech: null,
  say: (speech) => set({ speech }),

  toast: null,
  showToast: (toast) => {
    set({ toast: { ...toast, key: Date.now() } })
  },
  hideToast: () => set({ toast: null }),

  achievements: load(SAVE_KEY, []),
  unlock: (id) => {
    const { achievements, showToast } = get()
    if (achievements.includes(id)) return false
    const next = [...achievements, id]
    set({ achievements: next })
    save(SAVE_KEY, next)
    const secret = secrets.find((s) => s.id === id)
    if (secret) showToast({ title: `Secret found: ${secret.title}`, text: secret.text, icon: '★' })
    return true
  },

  visited: [],
  visitZone: (zone) => {
    const { visited, unlock } = get()
    if (visited.includes(zone)) return
    const next = [...visited, zone]
    set({ visited: next })
    if (ZONES.every((z) => next.includes(z))) setTimeout(() => unlock('explorer'), 1200)
  },
}))

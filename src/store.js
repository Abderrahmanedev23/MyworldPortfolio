import { create } from 'zustand'
import { Vector3 } from 'three'
import { secrets } from './content'
import { audio } from './audio'

const SAVE_KEY = 'myworld-achievements'
const SETTINGS_KEY = 'myworld-settings'
const VISITED_KEY = 'myworld-visited'
export const ZONES = ['about', 'projects', 'skills', 'experience', 'contact']

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function loadList(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
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

const DEFAULT_SETTINGS = {
  quality: isTouch ? 'low' : 'high', // low | medium | high
  music: 0.45,
  sfx: 0.8,
  muted: false,
  sensitivity: 1,
}

// Mutable, per-frame state shared between the player, camera and world.
// Kept outside React state so we don't re-render 60 times per second.
export const playerState = {
  position: new Vector3(0, 1, 4),
  velocity: new Vector3(),
  anim: 'idle', // idle | walk | run | jump | wave | sit
  facing: 0,
  grounded: true,
  surface: 'grass', // grass | sand | wood | stone
  sitAt: null, // { position: [x,y,z], rotation } while sitting
  teleport: null, // [x, y, z] → applied by the player on the next frame
  landedAt: -1, // clock time of the last landing (for squash, dust, camera bump)
  jumpedAt: -1,
}

export const useStore = create((set, get) => ({
  // boot: loading → title → playing
  phase: 'loading',
  ready: false,
  setReady: () => set({ ready: true }),
  start: () => set({ phase: 'playing' }),

  settings: load(SETTINGS_KEY, DEFAULT_SETTINGS),
  setSetting: (key, value) => {
    const settings = { ...get().settings, [key]: value }
    set({ settings })
    save(SETTINGS_KEY, settings)
  },

  indoors: false,
  setIndoors: (indoors) => set({ indoors }),

  night: false,
  setNight: (night) => set({ night }),

  area: null, // id of the named area the player is in
  setArea: (area) => set({ area }),

  // nearest interactable in range: { id, label, position, onInteract }
  nearby: null,
  setNearby: (nearby) => set({ nearby }),

  // content panel: { kind, data, focus }
  panel: null,
  openPanel: (panel) => {
    audio.play('open')
    set({ panel, dialogue: null })
    if (ZONES.includes(panel.kind)) get().visitZone(panel.kind)
  },
  closePanel: () => set({ panel: null }),

  // NPC conversation: { npc, lines: [..], index }
  dialogue: null,
  openDialogue: (dialogue) => set({ dialogue: { index: 0, ...dialogue } }),
  advanceDialogue: () => {
    const d = get().dialogue
    if (!d) return
    if (d.index + 1 < d.lines.length) set({ dialogue: { ...d, index: d.index + 1 } })
    else set({ dialogue: null })
  },
  closeDialogue: () => set({ dialogue: null }),

  // overlays that pause the game
  menu: null, // null | 'pause' | 'map'
  setMenu: (menu) => set({ menu }),

  toast: null,
  showToast: (toast) => set({ toast: { ...toast, key: Date.now() } }),
  hideToast: () => set({ toast: null }),

  // full-screen fade used by fast travel
  fade: false,
  setFade: (fade) => set({ fade }),

  achievements: loadList(SAVE_KEY),
  unlock: (id) => {
    const { achievements, showToast } = get()
    if (achievements.includes(id)) return false
    const next = [...achievements, id]
    set({ achievements: next })
    save(SAVE_KEY, next)
    const secret = secrets.find((s) => s.id === id)
    audio.play('achievement')
    if (secret) showToast({ kind: 'achievement', title: secret.title, text: secret.text, icon: '★' })
    return true
  },
  resetProgress: () => {
    set({ achievements: [], visited: [] })
    save(SAVE_KEY, [])
    save(VISITED_KEY, [])
  },

  visited: loadList(VISITED_KEY),
  visitZone: (zone) => {
    const { visited, unlock } = get()
    if (visited.includes(zone)) return
    const next = [...visited, zone]
    set({ visited: next })
    save(VISITED_KEY, next)
    if (ZONES.every((z) => next.includes(z))) setTimeout(() => unlock('explorer'), 1200)
  },
}))

/** Is gameplay blocked by a UI layer (panel, dialogue, menu, title)? */
export function isBusy() {
  const s = useStore.getState()
  return s.phase !== 'playing' || !!s.panel || !!s.dialogue || !!s.menu
}

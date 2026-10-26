import { useEffect } from 'react'
import { playerState, useStore, isTouch } from '../store'
import { audio } from '../audio'
import { tour as STOPS } from '../content'
import { AREAS } from '../world/layout'
import { input } from '../input'

const area = (id) => AREAS.find((a) => a.id === id)

/** Fly the player to a tour stop (with a fade) and frame the place. */
function goTo(step) {
  const { setFade, setTour } = useStore.getState()
  const stop = STOPS[step]
  const a = area(stop.area)
  setFade(true)
  audio.play('whoosh')
  setTimeout(() => {
    playerState.teleport = [a.spawn[0], 1.6, a.spawn[1]]
    playerState.sitAt = null
    playerState.boating = false
    useStore.getState().setBoating(false)
    const fx = a.pos[0] - a.spawn[0]
    const fz = a.pos[1] - a.spawn[1]
    input.cameraYaw = Math.atan2(-fx, -fz)
    playerState.facing = Math.atan2(fx, fz)
    setTour({ step, focus: [a.pos[0], 1.4, a.pos[1]] })
    setTimeout(() => setFade(false), 250)
  }, 380)
}

export function startTour() {
  const s = useStore.getState()
  s.closePanel()
  s.closeDialogue()
  s.setMenu(null)
  goTo(0)
}

export function nextTourStop() {
  const t = useStore.getState().tour
  if (!t) return
  if (t.step + 1 < STOPS.length) goTo(t.step + 1)
  else endTour(true)
}

export function endTour(finished = false) {
  const { setTour, showToast, unlock } = useStore.getState()
  setTour(null)
  audio.play('close')
  if (finished) {
    showToast({ title: 'Tour complete', text: 'The island is all yours. Have fun exploring!', icon: '🧭' })
    unlock('explorer')
  }
}

/** The guide's card at the bottom of the screen during the tour. */
export function TourCard() {
  const tour = useStore((s) => s.tour)
  const panel = useStore((s) => s.panel)
  const openPanel = useStore((s) => s.openPanel)
  useEffect(() => {
    const onNext = () => nextTourStop()
    window.addEventListener('tour-next', onNext)
    return () => window.removeEventListener('tour-next', onNext)
  }, [])
  if (!tour || panel) return null
  const stop = STOPS[tour.step]
  const last = tour.step === STOPS.length - 1
  return (
    <div className="dialogue-wrap">
      <div className="dialogue tour" key={tour.step}>
        <div className="portrait" style={{ background: '#8e6fd8' }}>
          <span>🎩</span>
        </div>
        <div className="dialogue-main">
          <span className="nametag" style={{ background: '#8e6fd8' }}>
            Mayor Pip · Tour {tour.step + 1}/{STOPS.length}
          </span>
          <h3 className="tour-title">{stop.title}</h3>
          <p className="dialogue-text">{stop.text}</p>
          <div className="tour-actions">
            {stop.open && (
              <button
                className="btn small"
                onClick={() => openPanel({ kind: stop.open.kind, data: stop.open.data, focus: tour.focus, focusDistance: 7 })}
              >
                {stop.open.label}
              </button>
            )}
            <button className="btn small next" onClick={nextTourStop}>
              {last ? 'Finish tour ✓' : 'Next stop →'}
            </button>
            <button className="btn ghost small" onClick={() => endTour()}>
              End tour
            </button>
            {!isTouch && <span className="tour-keys">E next · Esc end</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useStore, isTouch } from '../store'
import { audio } from '../audio'

const CPS = 42 // characters per second

/** RPG-style dialogue box with a portrait, name tag, typewriter text and voice blips. */
export function Dialogue() {
  const dialogue = useStore((s) => s.dialogue)
  const advance = useStore((s) => s.advanceDialogue)
  const close = useStore((s) => s.closeDialogue)
  const [shown, setShown] = useState(0)
  const line = dialogue ? dialogue.lines[dialogue.index] : ''
  const typing = shown < line.length
  const typingRef = useRef(typing)
  typingRef.current = typing
  const timer = useRef(null)

  // typewriter
  useEffect(() => {
    if (!dialogue) return
    setShown(0)
    let i = 0
    timer.current = setInterval(() => {
      i++
      setShown(i)
      if (i % 2 === 0 && /\w/.test(line[i - 1] ?? '')) audio.play('blip', { pitch: dialogue.npc.voice })
      if (i >= line.length) clearInterval(timer.current)
    }, 1000 / CPS)
    return () => clearInterval(timer.current)
  }, [dialogue, line])

  // E / Space / A → finish the line, or go to the next one
  useEffect(() => {
    const onAdvance = () => {
      if (typingRef.current) {
        clearInterval(timer.current)
        setShown(Infinity)
      } else {
        audio.play('click')
        advance()
      }
    }
    window.addEventListener('dialogue-advance', onAdvance)
    return () => window.removeEventListener('dialogue-advance', onAdvance)
  }, [advance])

  if (!dialogue) return null
  const { npc, lines, index } = dialogue
  return (
    <div className="dialogue-wrap">
      <div className="dialogue" onClick={() => window.dispatchEvent(new Event('dialogue-advance'))} role="dialog">
        <div className="portrait" style={{ background: npc.color }}>
          <span>{npc.emoji}</span>
        </div>
        <div className="dialogue-main">
          <span className="nametag" style={{ background: npc.color }}>
            {npc.name}
          </span>
          <p className="dialogue-text">
            {line.slice(0, shown)}
            <span className="ghost">{line.slice(shown)}</span>
          </p>
          <div className="dialogue-foot">
            <span className="pips">
              {lines.map((_, i) => (
                <i key={i} className={i <= index ? 'on' : ''} />
              ))}
            </span>
            {!typing && (
              <span className="continue">
                {index + 1 < lines.length ? (isTouch ? 'Tap ▼' : 'E ▼') : isTouch ? 'Tap to close' : 'E to close'}
              </span>
            )}
          </div>
        </div>
        <button
          className="icon-btn dialogue-x"
          onClick={(e) => {
            e.stopPropagation()
            audio.play('close')
            close()
          }}
          aria-label="Leave conversation"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

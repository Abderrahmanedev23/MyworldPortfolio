import { useStore, isTouch } from '../store'
import { fish as SPECIES } from '../content'

const RARITY = ['', 'Common', 'Uncommon', 'Rare', 'Very rare', 'Legendary']
const key = isTouch ? 'Tap ✋' : 'Press E'

/** Small hint while waiting for a bite, and a big flashing call to action when it bites. */
export function FishingHint() {
  const fishing = useStore((s) => s.fishing)
  if (!fishing || fishing.phase === 'caught' || fishing.phase === 'reel') return null
  if (fishing.phase === 'bite') return <div className="fish-hint bite">{key}!</div>
  return (
    <div className="fish-hint">
      🎣 Wait for the bobber to go under… <span>(move to reel in)</span>
    </div>
  )
}

export function CatchCard() {
  const fishing = useStore((s) => s.fishing)
  if (fishing?.phase !== 'caught') return null
  const { fish, size, isNew } = fishing.catch
  const sizeText = size >= 100 ? `${(size / 100).toFixed(2)} m` : `${size} cm`
  return (
    <div className="catch-wrap" onClick={() => window.dispatchEvent(new Event('fish-press'))}>
      <div className="catch-card" style={{ '--fish': fish.color }}>
        <div className="catch-rays" />
        {isNew && <span className="catch-new">NEW!</span>}
        <div className="catch-icon">{fish.emoji}</div>
        <p className="eyebrow">{fish.junk ? 'You fished up…' : 'You caught a…'}</p>
        <h2>{fish.name}!</h2>
        <div className="catch-meta">
          {!fish.junk && <span>📏 {sizeText}</span>}
          <span className={`rarity r${fish.rarity}`}>{'★'.repeat(fish.rarity)} {RARITY[fish.rarity]}</span>
        </div>
        <p className="catch-text">{fish.text}</p>
        <p className="catch-continue">{key} to continue</p>
      </div>
    </div>
  )
}

/** Fish collection grid (pause menu). */
export function Collection() {
  const collection = useStore((s) => s.collection)
  const caught = SPECIES.filter((f) => collection[f.id]).length
  return (
    <div>
      <p className="lead">
        {caught}/{SPECIES.length} discovered · cast from the beach or the end of the dock
      </p>
      <div className="collection">
        {SPECIES.map((f) => {
          const c = collection[f.id]
          return (
            <div key={f.id} className={`col-item ${c ? 'got' : ''}`} style={{ '--fish': f.color }}>
              <span className="col-emoji">{c ? f.emoji : '?'}</span>
              <b>{c ? f.name : '???'}</b>
              <small>
                {c ? (f.junk ? `×${c.count}` : `×${c.count} · best ${c.best >= 100 ? (c.best / 100).toFixed(2) + ' m' : c.best + ' cm'}`) : RARITY[f.rarity]}
              </small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

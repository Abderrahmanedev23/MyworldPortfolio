import { useState } from 'react'
import { useStore, isTouch } from '../store'
import { experience, profile, projects, skills } from '../content'
import { audio } from '../audio'

const HEADERS = {
  about: ['🏠', '#ff8c6b'],
  hobby: ['🖼', '#ff8fab'],
  project: ['🔧', '#4f7cff'],
  skills: ['🌱', '#5fb35a'],
  milestone: ['🪧', '#e0a458'],
  contact: ['✉', '#d62828'],
  secret: ['★', '#f4b400'],
  sign: ['⛲', '#2ec4b6'],
}

function Media({ image, video, title }) {
  if (video) {
    const isEmbed = /youtube\.com\/embed|player\.vimeo\.com/.test(video)
    return isEmbed ? (
      <iframe className="media" src={video} title={title} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
    ) : (
      <video className="media" src={video} controls playsInline />
    )
  }
  if (image) return <img className="media" src={image} alt={title} loading="lazy" />
  return null
}

function Links({ links }) {
  if (!links?.length) return null
  return (
    <div className="links">
      {links.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="btn">
          {l.label} ↗
        </a>
      ))}
    </div>
  )
}

function Pager({ index, total, onChange }) {
  return (
    <div className="pager">
      <button className="btn ghost" disabled={index === 0} onClick={() => onChange(index - 1)}>
        ← Prev
      </button>
      <span>
        {index + 1} / {total}
      </span>
      <button className="btn ghost" disabled={index === total - 1} onClick={() => onChange(index + 1)}>
        Next →
      </button>
    </div>
  )
}

function Project({ index, setIndex }) {
  const p = projects[index]
  return (
    <>
      <p className="eyebrow" style={{ color: p.color }}>
        Project #{index + 1}
      </p>
      <h2>{p.title}</h2>
      <p className="lead">{p.summary}</p>
      <Media image={p.image} video={p.video} title={p.title} />
      <p>{p.description}</p>
      <div className="tags">
        {p.tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>
      <Links links={p.links} />
      <Pager index={index} total={projects.length} onChange={setIndex} />
    </>
  )
}

function Skills({ highlight }) {
  const cats = [...new Set(skills.map((s) => s.category))]
  return (
    <>
      <p className="eyebrow">Skill garden</p>
      <h2>Skills</h2>
      <p className="lead">The bigger the plant, the stronger the skill.</p>
      {cats.map((c) => (
        <div key={c} className="skill-group">
          <h3>{c}</h3>
          {skills
            .filter((s) => s.category === c)
            .map((s) => (
              <div key={s.name} className={`skill ${s.name === highlight ? 'hl' : ''}`}>
                <span>{s.name}</span>
                <div className="bar">
                  <div style={{ width: `${(s.level / 5) * 100}%` }} />
                </div>
              </div>
            ))}
        </div>
      ))}
    </>
  )
}

function Milestones({ index, setIndex }) {
  return (
    <>
      <p className="eyebrow">Experience road</p>
      <h2>{experience[index].title}</h2>
      <p className="lead">
        {experience[index].year} · {experience[index].place}
      </p>
      <p>{experience[index].text}</p>
      <ol className="timeline">
        {experience.map((e, i) => (
          <li key={i} className={i === index ? 'current' : ''} onClick={() => setIndex(i)}>
            <b>{e.year}</b> {e.title} <span>— {e.place}</span>
          </li>
        ))}
      </ol>
      <Pager index={index} total={experience.length} onChange={setIndex} />
    </>
  )
}

function Contact() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const { email, socials } = profile.contact
  const send = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Hello from ${name || 'your portfolio'}`)
    const body = encodeURIComponent(message)
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <>
      <p className="eyebrow">Mailbox</p>
      <h2>Let's talk</h2>
      <p className="lead">Drop a letter in the mailbox — it opens your email app.</p>
      <form className="contact" onSubmit={send}>
        <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea placeholder="Your message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
        <button className="btn" type="submit">
          Send ✉
        </button>
      </form>
      <p>
        Or write to <a href={`mailto:${email}`}>{email}</a>{' '}
        <button className="btn ghost small" onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </p>
      <Links links={socials} />
    </>
  )
}

function Body({ panel }) {
  const [index, setIndex] = useState(panel.data ?? 0)
  switch (panel.kind) {
    case 'about':
      return (
        <>
          <p className="eyebrow">My house</p>
          <h2>About {profile.name}</h2>
          <p className="lead">
            {profile.role} · {profile.location}
          </p>
          {profile.bio.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <div className="tags">
            {profile.hobbies.map((h) => (
              <span key={h.id} className="tag" style={{ background: h.color }}>
                {h.title}
              </span>
            ))}
          </div>
        </>
      )
    case 'hobby':
      return (
        <>
          <p className="eyebrow">Hobby</p>
          <h2>{panel.data.title}</h2>
          <Media image={panel.data.image} title={panel.data.title} />
          <p>{panel.data.text}</p>
        </>
      )
    case 'project':
      return <Project index={index} setIndex={setIndex} />
    case 'skills':
      return <Skills highlight={panel.data} />
    case 'milestone':
      return <Milestones index={index} setIndex={setIndex} />
    case 'contact':
      return <Contact />
    case 'secret':
      return (
        <>
          <p className="eyebrow">★ Secret</p>
          <h2>{panel.data.title}</h2>
          <p>{panel.data.text}</p>
        </>
      )
    case 'sign':
    default:
      return (
        <>
          <p className="eyebrow">Welcome</p>
          <h2>{profile.name}'s World</h2>
          <p className="lead">{profile.tagline}</p>
          <ul className="howto">
            <li>🏠 <b>House</b> (north-west): about me</li>
            <li>🔧 <b>Workshop</b> (north-east): projects</li>
            <li>🌱 <b>Garden</b> (south-west): skills</li>
            <li>🪧 <b>Road</b> (south-east): experience</li>
            <li>📡 <b>Radio tower</b> (north): contact</li>
            <li>✨ Plus a few secrets for the curious…</li>
          </ul>
          {isTouch ? (
            <p>Use the joystick to walk, push it all the way to run, drag the screen to look around.</p>
          ) : (
            <p>
              <kbd>WASD</kbd> / arrows to walk · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump · <kbd>E</kbd> interact ·{' '}
              <kbd>R</kbd> wave · drag to look around · scroll to zoom
            </p>
          )}
        </>
      )
  }
}

export function Panel() {
  const panel = useStore((s) => s.panel)
  const closePanel = useStore((s) => s.closePanel)
  if (!panel) return null
  const close = () => {
    audio.play('close')
    closePanel()
  }
  const [icon, color] = HEADERS[panel.kind] ?? HEADERS.sign
  const accent = panel.kind === 'project' ? projects[panel.data ?? 0]?.color ?? color : color
  return (
    <div className="panel-wrap" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <section className="panel" role="dialog" aria-modal="true" style={{ '--accent': accent }}>
        <div className="panel-band">
          <span className="panel-icon">{icon}</span>
        </div>
        <button className="icon-btn close" onClick={close} aria-label="Close">
          ✕
        </button>
        <div className="panel-body">
          <Body key={`${panel.kind}-${panel.data?.id ?? panel.data}`} panel={panel} />
        </div>
        {!isTouch && <p className="panel-hint">Esc or E to close</p>}
      </section>
    </div>
  )
}

import { experience, profile, projects, skills } from '../content'

// Plain, fast, SEO/recruiter-friendly version of the same content.
export function ClassicSite() {
  const cats = [...new Set(skills.map((s) => s.category))]
  return (
    <div className="classic">
      <nav>
        <b>{profile.name}</b>
        <a href="#/">🏝️ Explore the 3D world</a>
      </nav>
      <header>
        <h1>{profile.name}</h1>
        <p className="lead">
          {profile.role} · {profile.location}
        </p>
        <p>{profile.tagline}</p>
      </header>

      <section id="about">
        <h2>About</h2>
        {profile.bio.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      <section id="projects">
        <h2>Projects</h2>
        <div className="cards">
          {projects.map((p) => (
            <article key={p.id} className="card" style={{ borderTopColor: p.color }}>
              {p.image && <img src={p.image} alt={p.title} loading="lazy" />}
              <h3>{p.title}</h3>
              <p>{p.summary}</p>
              <p className="muted">{p.description}</p>
              <div className="tags">
                {p.tags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
              <div className="links">
                {p.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="skills">
        <h2>Skills</h2>
        {cats.map((c) => (
          <p key={c}>
            <b>{c}:</b> {skills.filter((s) => s.category === c).map((s) => s.name).join(', ')}
          </p>
        ))}
      </section>

      <section id="experience">
        <h2>Experience</h2>
        <ol className="timeline">
          {[...experience].reverse().map((e, i) => (
            <li key={i}>
              <b>{e.year}</b> — {e.title}, <i>{e.place}</i>
              <p className="muted">{e.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="contact">
        <h2>Contact</h2>
        <p>
          <a href={`mailto:${profile.contact.email}`}>{profile.contact.email}</a>
        </p>
        <div className="links">
          {profile.contact.socials.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
              {s.label} ↗
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

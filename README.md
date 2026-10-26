# My World — a 3D explorable portfolio

A small, cozy low-poly island where every building is a piece of the portfolio.
Walk around as a mini-me, talk to the locals, find the secrets.

Built with **React Three Fiber**, **Rapier** physics, **Drei** and **Vite**. No 3D model
files yet: everything is made from code primitives, so it loads fast and is easy to swap later.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

Deploy: import the repo on Vercel (framework preset "Vite"). `vercel.json` is included.

## Controls

| | Desktop | Mobile |
|---|---|---|
| Move | WASD / ZQSD / arrows | joystick (push fully to run) |
| Run | Shift | — |
| Jump | Space | ⤒ button |
| Interact | E / Enter | ✋ button or tap the prompt |
| Wave | R | — |
| Camera | drag + scroll wheel | drag + pinch |
| Close panel | Esc / E | ✕ |

## The map

| Zone | Where | Content file |
|---|---|---|
| Spawn plaza: sign, fountain, bench, Mayor Pip | centre | `profile.json` |
| House (About): walk in, poster + hobby frames | north-west | `profile.json` |
| Workshop (Projects): one booth per project | north-east | `projects.json` |
| Skill garden: plant height = skill level | south-west | `skills.json` |
| Experience road: one signpost per entry | south-east | `experience.json` |
| Radio tower + mailbox (Contact) | north | `profile.json → contact` |
| Secrets: rooftop star (climb the crates), crystal cave, fishing dock, football goal, falling in the sea, visiting every zone | around | `secrets.json` |

Also: real-time day/night cycle (local clock, lamps at night), clouds, birds, a cat that
follows you, footprints on the sand, NPCs with one-liners, generated ambient sound (🔈 button),
HD/SD quality toggle, and a plain **classic site** at `#/classic` for recruiters and SEO.

## Make it yours

All content lives in `src/content/*.json`. Booths, plants and signposts are generated from it,
so you never need to touch 3D code to update the portfolio:

- `profile.json`: name, role, bio, hobbies, NPC lines, contact, and **avatar colours** (skin, hair, hoodie, glasses…)
- `projects.json`: `image` takes an image URL, `video` takes a YouTube `/embed/` URL or an mp4
- `skills.json`: `level` from 1 to 5
- `experience.json`: in chronological order
- `secrets.json`: titles and texts of the achievements

Zone positions live in `src/world/layout.js`.

### Testing tips

- `?hour=21` in the URL forces the time of day.
- In dev mode, `window.__teleport(x, z)` moves the player.

## Next steps (art pass)

- Replace `src/world/Avatar.jsx` with a Blender/Mixamo model (`useGLTF` + `useAnimations`)
  driven by the same `playerState.anim` values (`idle | walk | run | jump | wave | sit`).
- Swap primitive buildings for `.glb` models from Kenney.nl, Quaternius or Poly Pizza (put them in `public/models`).

# My World — a 3D explorable portfolio

A small, cozy island in the style of Animal Crossing, where every building is a piece of the portfolio.
Walk around as a mini-me, talk to the locals, find the secrets.

Built with **React Three Fiber**, **Rapier** physics, **Drei**, **postprocessing** and **Vite**.
There are no 3D model or audio files: the world, shaders, music and sound effects are all generated in code,
so it loads fast and works offline.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

### With Docker

```bash
docker compose up --build        # http://localhost:8080
# or without compose:
docker build -t myworld-portfolio .
docker run --rm -p 8080:80 myworld-portfolio
```

The image is a two-stage build: Node builds the site, then nginx (~80 MB image) serves `dist/`.
It sends every route to `index.html`, gzips responses, and caches the hashed assets for a long time.

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
| Map / fast travel | M | 🗺 button |
| Pause / settings | Esc / P | ⏸ button |

Gamepads work too: left stick to move, right stick for the camera, A to jump, X/B to interact,
Y to wave, Start to pause, View/Select for the map.

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

**Look and feel**
- Cozy rendering: soft ambient occlusion, bloom, neutral tone mapping, a vignette, procedural environment lighting,
  stylized water with shore foam, wind-blown grass that parts around you, round trees, blossom trees and bushes.
- Real-time day/night cycle on the visitor's clock: lamps, fireflies, stars, and a lantern glow around the player at night.
- Particles: dust when running or landing, falling petals, sparkles on undiscovered secrets.
- Generative lo-fi music, footsteps that sound different on grass, sand, stone and wood, NPC voice blips, UI sounds.

**Game UI**
- Loading screen with tips, then a title screen over a slow fly-around of the island.
- HUD: player card, quest tracker (places explored + secrets), a minimap that rotates with the camera, and zone titles when you enter an area.
- RPG dialogue boxes with portraits and a typewriter effect, a map screen with fast travel, and a pause menu with
  settings (graphics Low/Medium/High, music and effects volume, camera sensitivity), controls and progress.
- Quality presets, and automatic downgrading when the frame rate drops (production builds).
- A plain **classic site** at `#/classic` for recruiters and SEO.

## Make it yours

All content lives in `src/content/*.json`. Booths, plants and signposts are generated from it,
so you never need to touch 3D code to update the portfolio:

- `profile.json`: name, role, bio, hobbies, NPC conversations (`npcs`), contact, and **avatar colours** (skin, hair, hoodie, glasses…)
- `projects.json`: `image` takes an image URL, `video` takes a YouTube `/embed/` URL or an mp4
- `skills.json`: `level` from 1 to 5
- `experience.json`: in chronological order
- `secrets.json`: titles and texts of the achievements

Zone positions, area names (for zone titles and the map) and NPCs live in `src/world/layout.js`.

### Testing tips

- `?hour=21` in the URL forces the time of day.
- In dev mode the automatic quality downgrade is off; pick a preset in the pause menu.
- In dev mode, `window.__teleport(x, z)` moves the player.

## Next steps (art pass)

- Replace `src/world/Avatar.jsx` with a Blender/Mixamo model (`useGLTF` + `useAnimations`)
  driven by the same `playerState.anim` values (`idle | walk | run | jump | wave | sit`).
- Swap primitive buildings for `.glb` models from Kenney.nl, Quaternius or Poly Pizza (put them in `public/models`).

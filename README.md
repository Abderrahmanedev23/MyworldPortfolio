# My World — a 3D explorable portfolio

A small, cozy island in the style of Animal Crossing, where every building is a piece of the portfolio.
Walk around as a mini-me, talk to the locals, find the secrets.

Built with **React Three Fiber**, **Rapier** physics, **Drei**, **postprocessing** and **Vite**.
The characters and the fox are small animated glTF models (about 1.4 MB in total). Everything else
(island, shaders, music and sound effects) is generated in code.

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
| Interact / talk / fish | E / Enter | ✋ button or tap the prompt |
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

**Things to do**
- **Swim**: walk off the beach or jump off the dock. Swim back to the sand or the dock to climb out
  (a current pushes you back if you go too far out).
- **Fish**: stand on the beach or at the end of the dock and press E. Wait for the nibbles, then press E the
  moment the bobber goes under. There are 11 catches to collect (some only bite at night); see them under
  *Pause → Fish collection*.
- **Row the boat** moored at the dock (W/S to row, A/D to steer, E to get out near land). Far out to the south-west
  there's a **secret islet** with a treasure chest.
- **Guided tour**: Mayor Pip walks recruiters through every zone in a minute (title screen, welcome sign or pause menu).
  The stops are in `src/content/tour.json`.
- **Photo mode** (C or 📷): free camera, filters, poses and a polaroid frame. The photo downloads as a PNG.
- Talk to the locals (the mayor and gardener stroll around, Sam jogs laps of the beach), kick the ball into the goal,
  sit on benches, climb to the workshop roof, find the cave.

**Look and feel**
- Cozy rendering: soft ambient occlusion, bloom, neutral tone mapping, a vignette, procedural environment lighting,
  stylized water with shore foam, wind-blown grass that parts around you, round trees, blossom trees and bushes.
- Weather that changes every few minutes: rain (rare fish bite more), a rainbow afterwards, cherry-blossom breezes.
- Butterflies, crabs that dig in when you get close, dolphins leaping offshore.
- Workshop screens show a scrolling mock website for each project, or its real `image` from `projects.json`.
- Real-time day/night cycle on the visitor's clock: lamps, fireflies, stars, and a lantern glow around the player at night.
- Animated characters (KayKit) with blended walk/run/jump/sit/cheer/throw/swim animations and ink outlines.
- A fox companion that follows you and waits on the beach while you swim.
- Seagulls that flap, glide and bank, perch on the dock and the chimney, and take off when you get close.
- Particles: dust, water ripples and splashes, falling petals, fireflies, sparkles on undiscovered secrets.
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
- `fish.json`: the fish you can catch (name, emoji, colour, rarity 1–5, size range, `night: true` for night fish)

Zone positions, area names (for zone titles and the map) and NPCs live in `src/world/layout.js`.

### Testing tips

- `?hour=21` in the URL forces the time of day, `?weather=rain` (or `clear` / `blossom`) the weather.
- In dev mode the automatic quality downgrade is off; pick a preset in the pause menu.
- In dev mode, `window.__teleport(x, z)` moves the player.

### Models

The ready-to-use models live in `public/models/`. They're made from the originals by `scripts/build-models.mjs`,
which removes weapons, keeps only the animations the game uses and compresses everything with meshopt:

```bash
# put the source .glb files in models-src/ (see the script for where to download them), then:
node scripts/build-models.mjs
```

- **Pick a different character**: set `avatar.model` in `profile.json` to `player`, `mayor`, `gardener` or `fisher`,
  or to `procedural` for the code-built chibi (it uses the `avatar` colours).
- **Use your own mini-me**: export a rigged `.glb` from Blender (Mixamo animations work), add it to the
  script or drop it in `public/models/`, and map its clip names in `CLIPS` in `src/world/Character.jsx`.

## Credits

- Characters: [KayKit Character Pack: Adventurers](https://kaylousberg.itch.io/kaykit-adventurers) by Kay Lousberg (CC0).
- Fox: Low poly fox by PixelMannen & tomkranis, rigged by AsoboStudio & scurest,
  from [glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox) (CC-BY 4.0).

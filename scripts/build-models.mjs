// Optimises the source models in models-src/ into small web-ready files in public/models/.
//
//   node scripts/build-models.mjs
//
// For each model: drop weapon / accessory meshes we don't want, keep only the
// animations the game uses, then prune, dedupe, resample and meshopt-compress.
// Sources (download into models-src/):
//   KayKit Character Pack: Adventurers (CC0) — https://kaylousberg.itch.io/kaykit-adventurers
//   Low poly Fox (CC-BY 4.0) — glTF-Sample-Assets/Models/Fox
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, resample } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

const CHARACTER_ANIMS = [
  'Idle',
  'Walking_A',
  'Running_A',
  'Running_B',
  'Jump_Start',
  'Jump_Idle',
  'Jump_Land',
  'Cheer',
  'Interact',
  'Sit_Chair_Idle',
  'Sit_Floor_Idle',
  'Throw',
  'Use_Item',
  'PickUp',
]
const NPC_ANIMS = ['Idle', 'Cheer', 'Interact', 'Sit_Chair_Idle', 'Sit_Floor_Idle']

const MODELS = [
  {
    src: 'Rogue_Hooded.glb',
    out: 'player.glb',
    remove: ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable', 'Rogue_Cape'],
    anims: CHARACTER_ANIMS,
  },
  {
    src: 'Knight.glb',
    out: 'mayor.glb',
    remove: ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword', 'Knight_Helmet'],
    anims: NPC_ANIMS,
  },
  {
    src: 'Mage.glb',
    out: 'gardener.glb',
    remove: ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', 'Mage_Cape'],
    anims: NPC_ANIMS,
  },
  {
    src: 'Barbarian.glb',
    out: 'fisher.glb',
    remove: ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Barbarian_Cape'],
    anims: NPC_ANIMS,
  },
  { src: 'Fox.glb', out: 'fox.glb', remove: [], anims: ['Survey', 'Walk', 'Run'] },
]

await MeshoptDecoder.ready
await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

for (const m of MODELS) {
  const doc = await io.read(`models-src/${m.src}`)
  const root = doc.getRoot()
  for (const node of root.listNodes()) {
    if (m.remove.includes(node.getName())) node.dispose()
  }
  for (const anim of root.listAnimations()) {
    if (m.anims.includes(anim.getName())) continue
    anim.listChannels().forEach((c) => c.dispose())
    anim.listSamplers().forEach((s) => s.dispose())
    anim.dispose()
  }
  await doc.transform(prune(), dedup(), resample(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
  await io.write(`public/models/${m.out}`, doc)
  const kept = root.listAnimations().map((a) => a.getName())
  console.log(`${m.out}: ${kept.length} animations (${kept.join(', ')})`)
}

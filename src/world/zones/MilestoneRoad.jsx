import { Label } from '../Label'
import { Signpost } from './Props'
import { useInteractable } from '../../interaction'
import { useStore } from '../../store'
import { experience } from '../../content'
import { ROAD, pointsAlong } from '../layout'

function Milestone({ item, index, pos, angle }) {
  const openPanel = useStore((s) => s.openPanel)
  // signs stand beside the road, facing it
  const side = index % 2 ? 1 : -1
  const nx = Math.cos(angle) * side * 1.9
  const nz = -Math.sin(angle) * side * 1.9
  const x = pos[0] + nx
  const z = pos[1] + nz
  const face = Math.atan2(-nx, -nz)
  useInteractable(`milestone-${index}`, {
    position: [x - nx * 0.4, 0, z - nz * 0.4],
    radius: 1.9,
    label: `${item.year} · ${item.title}`,
    promptHeight: 2.5,
    onInteract: () => openPanel({ kind: 'milestone', data: index, focus: [x, 1.6, z], focusDistance: 3.6 }),
  })
  return (
    <group position={[x, 0, z]} rotation={[0, face, 0]}>
      <Signpost width={1.9} boardHeight={0.85} height={1.6} color={index === experience.length - 1 ? '#ffd166' : '#c58b52'}>
        <Label text={item.year} size={0.32} background={null} position={[0, 0.15, 0]} />
        <Label text={item.title} size={0.14} background={null} font="500" position={[0, -0.2, 0]} />
      </Signpost>
    </group>
  )
}

export function MilestoneRoad() {
  const spots = pointsAlong(ROAD, experience.length)
  const start = ROAD[0]
  return (
    <group>
      <group position={[start[0] + 1.6, 0, start[1] - 0.2]} rotation={[0, 0.5, 0]}>
        <Label text={'Experience road →'} size={0.32} position={[0, 0.4, 0]} billboard />
      </group>
      {experience.map((item, i) => (
        <Milestone key={i} item={item} index={i} pos={spots[i].pos} angle={spots[i].angle} />
      ))}
    </group>
  )
}

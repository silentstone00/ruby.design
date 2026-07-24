import { ChevronDown, Frame, Image, Minus, MousePointer2, Square, Type } from 'lucide-react'
import type { DesignNode, DesignScene } from '../document/scene'

type LayersPanelProps = {
  scene: DesignScene
  selectedId: string | null
  onSelect: (id: string) => void
}

type LayerItem = {
  node: DesignNode
  depth: number
}

export function LayersPanel({ scene, selectedId, onSelect }: LayersPanelProps) {
  const activeFrame = findActiveFrame(scene, selectedId)
  if (!activeFrame) return null

  const layers = collectLayers(scene, activeFrame.id)
  return (
    <aside className="layers-panel" aria-label={`${activeFrame.name} layers`}>
      <div className="layers-panel-heading">
        <span>Layers</span>
        <span className="layers-panel-count">{layers.length}</span>
      </div>
      <button className={selectedId === activeFrame.id ? 'layer-row is-selected' : 'layer-row'} onClick={() => onSelect(activeFrame.id)} aria-pressed={selectedId === activeFrame.id}>
        <ChevronDown size={14} aria-hidden="true" />
        <Frame size={15} aria-hidden="true" />
        <span>{activeFrame.name}</span>
      </button>
      {layers.length > 0 && <div className="layer-tree">
        {layers.map(({ node, depth }) => <button key={node.id} className={selectedId === node.id ? 'layer-row is-selected' : 'layer-row'} style={{ '--layer-depth': depth } as React.CSSProperties} onClick={() => onSelect(node.id)} aria-pressed={selectedId === node.id}>
          <LayerIcon type={node.type} />
          <span>{node.name}</span>
        </button>)}
      </div>}
    </aside>
  )
}

function LayerIcon({ type }: { type: DesignNode['type'] }) {
  if (type === 'frame') return <Frame size={15} aria-hidden="true" />
  if (type === 'text') return <Type size={15} aria-hidden="true" />
  if (type === 'image') return <Image size={15} aria-hidden="true" />
  if (type === 'line' || type === 'arrow') return <Minus size={15} aria-hidden="true" />
  if (type === 'ellipse') return <MousePointer2 size={15} aria-hidden="true" />
  return <Square size={14} aria-hidden="true" />
}

function findActiveFrame(scene: DesignScene, selectedId: string | null) {
  let node = scene.nodes.find((candidate) => candidate.id === selectedId)
  const visited = new Set<string>()
  while (node && !visited.has(node.id)) {
    if (node.type === 'frame') return node
    visited.add(node.id)
    node = scene.nodes.find((candidate) => candidate.id === node?.parentId)
  }
  return null
}

function collectLayers(scene: DesignScene, frameId: string, depth = 1): LayerItem[] {
  const children = scene.nodes.filter((node) => node.parentId === frameId).reverse()
  return children.flatMap((node) => [{ node, depth }, ...(node.type === 'frame' ? collectLayers(scene, node.id, depth + 1) : [])])
}

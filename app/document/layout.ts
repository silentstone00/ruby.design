import type { DesignNode, DesignScene, FrameLayout, LayoutSizing } from './scene'

const DEFAULT_LAYOUT: FrameLayout = {
  direction: 'none',
  gap: 12,
  padding: { top: 16, right: 16, bottom: 16, left: 16 },
  align: 'start',
  justify: 'start',
}

const DEFAULT_SIZING: LayoutSizing = { horizontal: 'fixed', vertical: 'fixed' }

/** Returns display geometry for Auto Layout frames without mutating the saved scene. */
export function resolveSceneLayout(scene: DesignScene): DesignScene {
  const nodes = scene.nodes.map((node) => ({ ...node }))
  const childrenByParent = new Map<string, DesignNode[]>()
  for (const node of nodes) {
    if (!node.parentId) continue
    const children = childrenByParent.get(node.parentId) ?? []
    children.push(node)
    childrenByParent.set(node.parentId, children)
  }

  const visited = new Set<string>()
  function resolveFrame(frame: DesignNode) {
    if (visited.has(frame.id)) return
    visited.add(frame.id)
    const children = childrenByParent.get(frame.id) ?? []
    if (frame.layout?.direction && frame.layout.direction !== 'none') applyStackLayout(frame, children)
    for (const child of children) if (child.type === 'frame') resolveFrame(child)
  }

  for (const node of nodes) if (node.type === 'frame' && !node.parentId) resolveFrame(node)
  for (const node of nodes) if (node.type === 'frame') resolveFrame(node)
  return { nodes }
}

export function isAutoLayoutChild(scene: DesignScene, node: DesignNode) {
  const parent = node.parentId ? scene.nodes.find((candidate) => candidate.id === node.parentId) : undefined
  return parent?.type === 'frame' && parent.layout?.direction !== undefined && parent.layout.direction !== 'none'
}

function applyStackLayout(frame: DesignNode, children: DesignNode[]) {
  const layout = { ...DEFAULT_LAYOUT, ...frame.layout, padding: { ...DEFAULT_LAYOUT.padding, ...frame.layout?.padding } }
  const horizontal = layout.direction === 'horizontal'
  const mainAvailable = (horizontal ? frame.width : frame.height) - (horizontal ? layout.padding.left + layout.padding.right : layout.padding.top + layout.padding.bottom)
  const crossAvailable = (horizontal ? frame.height : frame.width) - (horizontal ? layout.padding.top + layout.padding.bottom : layout.padding.left + layout.padding.right)
  const sizingFor = (node: DesignNode) => node.layoutSizing ?? DEFAULT_SIZING
  const mainMode = (node: DesignNode) => horizontal ? sizingFor(node).horizontal : sizingFor(node).vertical
  const crossMode = (node: DesignNode) => horizontal ? sizingFor(node).vertical : sizingFor(node).horizontal
  const fillCount = children.filter((node) => mainMode(node) === 'fill').length
  const fixedTotal = children.reduce((total, node) => total + (mainMode(node) === 'fill' ? 0 : preferredSize(node, horizontal ? 'horizontal' : 'vertical')), 0)
  const defaultGapTotal = Math.max(0, children.length - 1) * layout.gap
  const fillSize = Math.max(24, (mainAvailable - fixedTotal - defaultGapTotal) / Math.max(fillCount, 1))
  const occupied = fixedTotal + fillSize * fillCount + defaultGapTotal
  const remaining = Math.max(0, mainAvailable - occupied)
  const gap = layout.justify === 'space-between' && children.length > 1 ? layout.gap + remaining / (children.length - 1) : layout.gap
  let cursor = horizontal ? layout.padding.left : layout.padding.top
  if (layout.justify === 'center') cursor += remaining / 2
  if (layout.justify === 'end') cursor += remaining

  for (const child of children) {
    const main = mainMode(child) === 'fill' ? fillSize : preferredSize(child, horizontal ? 'horizontal' : 'vertical')
    const cross = crossMode(child) === 'fill' || layout.align === 'stretch' ? crossAvailable : preferredSize(child, horizontal ? 'vertical' : 'horizontal')
    const crossStart = horizontal ? layout.padding.top : layout.padding.left
    const crossOffset = layout.align === 'center' ? Math.max(0, (crossAvailable - cross) / 2) : layout.align === 'end' ? Math.max(0, crossAvailable - cross) : 0
    if (horizontal) Object.assign(child, { x: cursor, y: crossStart + crossOffset, width: main, height: cross })
    else Object.assign(child, { x: crossStart + crossOffset, y: cursor, width: cross, height: main })
    cursor += main + gap
  }
}

function preferredSize(node: DesignNode, axis: 'horizontal' | 'vertical') {
  const sizing = node.layoutSizing ?? DEFAULT_SIZING
  const mode = axis === 'horizontal' ? sizing.horizontal : sizing.vertical
  if (mode !== 'hug') return axis === 'horizontal' ? node.width : node.height
  if (node.text !== undefined) {
    const fontSize = node.fontSize ?? 16
    return axis === 'horizontal' ? Math.max(24, Math.ceil(node.text.length * fontSize * 0.58)) : Math.ceil(fontSize * 1.3)
  }
  return axis === 'horizontal' ? node.width : node.height
}

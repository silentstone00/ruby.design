import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { type KeyboardEvent, type PointerEvent, type WheelEvent, useEffect, useState } from 'react'
import type { DesignNode, DesignScene } from '../document/scene'

type Point = { x: number; y: number }
type Bounds = { x: number; y: number; width: number; height: number }
type ResizeCorner = 'nw' | 'ne' | 'se' | 'sw'
type InteractionPhase = 'start' | 'move' | 'end'
type Viewport = { x: number; y: number; zoom: number }

const CANVAS_WIDTH = 1100
const CANVAS_HEIGHT = 1000

type DesignCanvasProps = {
  scene: DesignScene
  selectedIds: string[]
  onSelect: (id: string | null, modifiers?: { toggle: boolean }) => void
  onSelectMany: (ids: string[]) => void
  onHover: (id: string | null) => void
  onMove: (ids: string[], dx: number, dy: number, phase: InteractionPhase) => void
  onResize: (id: string, bounds: Bounds, phase: InteractionPhase) => void
  onRotate: (id: string, rotation: number, phase: InteractionPhase) => void
  onTextCommit: (id: string, text: string) => void
}

type CanvasInteraction =
  | { type: 'move'; ids: string[]; last: Point }
  | { type: 'resize'; id: string; corner: ResizeCorner; origin: Bounds; start: Point }
  | { type: 'rotate'; id: string; origin: number; startAngle: number }
  | { type: 'marquee'; start: Point; baseIds: string[] }
  | { type: 'pan'; lastClient: Point }
  | null

export function DesignCanvas({ scene, selectedIds, onSelect, onSelectMany, onHover, onMove, onResize, onRotate, onTextCommit }: DesignCanvasProps) {
  const [interaction, setInteraction] = useState<CanvasInteraction>(null)
  const [marquee, setMarquee] = useState<Bounds | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [spaceDown, setSpaceDown] = useState(false)
  const primaryId = selectedIds.at(-1) ?? null

  useEffect(() => {
    const keyDown = (event: globalThis.KeyboardEvent) => { if (event.code === 'Space' && !isTyping(event.target)) setSpaceDown(true) }
    const keyUp = (event: globalThis.KeyboardEvent) => { if (event.code === 'Space') setSpaceDown(false) }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    return () => { window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp) }
  }, [])

  useEffect(() => {
    const keyDown = (event: globalThis.KeyboardEvent) => {
      if (isTyping(event.target)) return
      if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomBy(1.25) }
      if (event.key === '-') { event.preventDefault(); zoomBy(0.8) }
      if (event.key === '0') { event.preventDefault(); fitSelection() }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault()
        const amount = event.shiftKey ? 120 : 40
        setViewport((current) => ({ ...current, x: current.x + (event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0) / current.zoom, y: current.y + (event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0) / current.zoom }))
      }
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  }, [scene, selectedIds])

  function toCanvasPoint(event: PointerEvent<SVGElement>): Point {
    const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.currentTarget.ownerSVGElement
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const visibleWidth = CANVAS_WIDTH / viewport.zoom
    const visibleHeight = CANVAS_HEIGHT / viewport.zoom
    return { x: viewport.x + (event.clientX - rect.left) * visibleWidth / rect.width, y: viewport.y + (event.clientY - rect.top) * visibleHeight / rect.height }
  }

  function startNodeDrag(event: PointerEvent<SVGElement>, node: DesignNode) {
    if (event.button !== 0 || spaceDown) return
    event.stopPropagation()
    const toggle = event.shiftKey || event.metaKey || event.ctrlKey
    const ids = selectedIds.includes(node.id) && !toggle ? selectedIds : [node.id]
    onSelect(node.id, { toggle })
    const point = toCanvasPoint(event)
    setInteraction({ type: 'move', ids, last: point })
    onMove(ids, 0, 0, 'start')
  }

  function startResize(event: PointerEvent<SVGRectElement>, corner: ResizeCorner, node: DesignNode) {
    if (event.button !== 0 || spaceDown) return
    event.stopPropagation()
    const point = toCanvasPoint(event)
    const origin = { x: node.x, y: node.y, width: node.width, height: node.height }
    setInteraction({ type: 'resize', id: node.id, corner, origin, start: point })
    onResize(node.id, origin, 'start')
  }

  function startRotate(event: PointerEvent<SVGCircleElement>, node: DesignNode) {
    if (event.button !== 0 || spaceDown) return
    event.stopPropagation()
    const point = toCanvasPoint(event)
    setInteraction({ type: 'rotate', id: node.id, origin: node.rotation ?? 0, startAngle: angleFromNodeCenter(node, point) })
    onRotate(node.id, node.rotation ?? 0, 'start')
  }

  function startMarquee(event: PointerEvent<SVGSVGElement>) {
    if (event.button === 1 || spaceDown) {
      event.preventDefault()
      setInteraction({ type: 'pan', lastClient: { x: event.clientX, y: event.clientY } })
      return
    }
    if (event.button !== 0) return
    const target = event.target as Element
    if (target.closest('.canvas-node') || target.closest('.resize-handle') || target.closest('.rotation-handle')) return
    const start = toCanvasPoint(event)
    const baseIds = event.shiftKey || event.metaKey || event.ctrlKey ? selectedIds : []
    if (!baseIds.length) onSelect(null)
    setInteraction({ type: 'marquee', start, baseIds })
    setMarquee({ x: start.x, y: start.y, width: 0, height: 0 })
  }

  function movePointer(event: PointerEvent<SVGSVGElement>) {
    if (!interaction) return
    const point = toCanvasPoint(event)
    if (interaction.type === 'pan') {
      const rect = event.currentTarget.getBoundingClientRect()
      const dx = (event.clientX - interaction.lastClient.x) * CANVAS_WIDTH / (rect.width * viewport.zoom)
      const dy = (event.clientY - interaction.lastClient.y) * CANVAS_HEIGHT / (rect.height * viewport.zoom)
      setViewport((current) => ({ ...current, x: current.x - dx, y: current.y - dy }))
      setInteraction({ type: 'pan', lastClient: { x: event.clientX, y: event.clientY } })
      return
    }
    if (interaction.type === 'move') {
      const dx = point.x - interaction.last.x
      const dy = point.y - interaction.last.y
      if (dx || dy) onMove(interaction.ids, dx, dy, 'move')
      setInteraction({ ...interaction, last: point })
      return
    }
    if (interaction.type === 'resize') {
      const bounds = resizedBounds(interaction.origin, interaction.corner, point.x - interaction.start.x, point.y - interaction.start.y, event.shiftKey)
      onResize(interaction.id, bounds, 'move')
      return
    }
    if (interaction.type === 'rotate') {
      const node = scene.nodes.find((item) => item.id === interaction.id)
      if (!node) return
      onRotate(interaction.id, interaction.origin + normalizeAngle(angleFromNodeCenter(node, point) - interaction.startAngle), 'move')
      return
    }
    const bounds = boundsFromPoints(interaction.start, point)
    setMarquee(bounds)
    const overlapping = scene.nodes.filter((node) => intersects(bounds, node)).map((node) => node.id)
    onSelectMany([...new Set([...interaction.baseIds, ...overlapping])])
  }

  function endPointer() {
    if (!interaction) return
    if (interaction.type === 'move') onMove(interaction.ids, 0, 0, 'end')
    if (interaction.type === 'resize') onResize(interaction.id, interaction.origin, 'end')
    if (interaction.type === 'rotate') onRotate(interaction.id, interaction.origin, 'end')
    setInteraction(null)
    setMarquee(null)
  }

  function commitText(node: DesignNode, text: string) {
    if (text !== node.text) onTextCommit(node.id, text)
    setEditingId(null)
  }

  function zoomAt(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const fractionX = (event.clientX - rect.left) / rect.width
    const fractionY = (event.clientY - rect.top) / rect.height
    setViewport((current) => {
      const nextZoom = clamp(current.zoom * (event.deltaY < 0 ? 1.12 : 0.89), 0.25, 4)
      const worldX = current.x + fractionX * CANVAS_WIDTH / current.zoom
      const worldY = current.y + fractionY * CANVAS_HEIGHT / current.zoom
      return { zoom: nextZoom, x: worldX - fractionX * CANVAS_WIDTH / nextZoom, y: worldY - fractionY * CANVAS_HEIGHT / nextZoom }
    })
  }

  function zoomBy(factor: number) {
    setViewport((current) => ({ ...current, zoom: clamp(current.zoom * factor, 0.25, 4) }))
  }

  function fitSelection() {
    const nodes = scene.nodes.filter((node) => selectedIds.includes(node.id))
    if (!nodes.length) return
    const left = Math.min(...nodes.map((node) => node.x))
    const top = Math.min(...nodes.map((node) => node.y))
    const right = Math.max(...nodes.map((node) => node.x + node.width))
    const bottom = Math.max(...nodes.map((node) => node.y + node.height))
    const padding = 80
    const zoom = clamp(Math.min(CANVAS_WIDTH / (right - left + padding * 2), CANVAS_HEIGHT / (bottom - top + padding * 2)), 0.25, 4)
    setViewport({ zoom, x: (left + right) / 2 - CANVAS_WIDTH / (zoom * 2), y: (top + bottom) / 2 - CANVAS_HEIGHT / (zoom * 2) })
  }

  const primary = scene.nodes.find((node) => node.id === primaryId) ?? null
  const visibleWidth = CANVAS_WIDTH / viewport.zoom
  const visibleHeight = CANVAS_HEIGHT / viewport.zoom
  return (
    <div className="canvas-root">
      <div className="canvas-chrome"><span>Prototype canvas</span><span>{Math.round(viewport.zoom * 100)}%</span><button onClick={() => zoomBy(0.8)} title="Zoom out" aria-label="Zoom out"><ZoomOut size={14} /></button><button onClick={() => zoomBy(1.25)} title="Zoom in" aria-label="Zoom in"><ZoomIn size={14} /></button><button disabled={!selectedIds.length} onClick={fitSelection} title="Fit selection" aria-label="Fit selection"><Maximize2 size={14} /></button></div>
      <svg className="design-canvas" viewBox={`${viewport.x} ${viewport.y} ${visibleWidth} ${visibleHeight}`} role="application" aria-label="Design canvas" onPointerDown={startMarquee} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer} onWheel={zoomAt}>
        <defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#cbd5e1" /></pattern><marker id="arrow-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
        <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#dots)" />
        {scene.nodes.map((node) => <Node key={node.id} node={node} selected={selectedIds.includes(node.id)} onHover={onHover} onPointerDown={startNodeDrag} onDoubleClick={() => node.text !== undefined && setEditingId(node.id)} />)}
        {marquee && <rect className="marquee-selection" {...marquee} />}
        {primary && <ResizeHandles node={primary} zoom={viewport.zoom} onPointerDown={startResize} onRotate={startRotate} />}
      </svg>
      {editingId && (() => {
        const node = scene.nodes.find((item) => item.id === editingId)
        return node ? <TextEditor key={node.id} node={node} viewport={viewport} onCommit={commitText} onCancel={() => setEditingId(null)} /> : null
      })()}
    </div>
  )
}

function Node({ node, selected, onHover, onPointerDown, onDoubleClick }: { node: DesignNode; selected: boolean; onHover: (id: string | null) => void; onPointerDown: (event: PointerEvent<SVGElement>, node: DesignNode) => void; onDoubleClick: () => void }) {
  const radius = node.radius?.topLeft ?? 0
  const rotation = node.rotation ?? 0
  const common = { onPointerDown: (event: PointerEvent<SVGElement>) => onPointerDown(event, node), onPointerEnter: () => onHover(node.id), onPointerLeave: () => onHover(null), onDoubleClick, className: selected ? 'canvas-node is-selected' : 'canvas-node', opacity: node.opacity ?? 1, transform: rotation ? `rotate(${rotation} ${node.x + node.width / 2} ${node.y + node.height / 2})` : undefined }
  const selection = selected ? <rect vectorEffect="non-scaling-stroke" className="selection-outline" x={node.x - 5} y={node.y - 5} width={node.width + 10} height={node.height + 10} rx={radius + 5} /> : null
  const anchor = node.textAlign ?? (node.type === 'text' ? 'left' : 'center')
  const textX = anchor === 'left' ? node.x : anchor === 'right' ? node.x + node.width : node.x + node.width / 2
  const svgAnchor = anchor === 'left' ? 'start' : anchor === 'right' ? 'end' : 'middle'
  if (node.type === 'text') return <g {...common}>{selection}<text x={textX} y={node.y + (node.fontSize ?? 16)} fill={node.color} fontSize={node.fontSize} fontWeight={node.fontWeight ?? 400} textAnchor={svgAnchor}>{node.text}</text></g>
  if (node.type === 'ellipse') return <g {...common}>{selection}<ellipse cx={node.x + node.width / 2} cy={node.y + node.height / 2} rx={node.width / 2} ry={node.height / 2} fill={node.fill} stroke={node.stroke ?? 'none'} strokeWidth={node.strokeWidth ?? 0} /></g>
  if (node.type === 'line' || node.type === 'arrow') return <g {...common}>{selection}<line x1={node.x} y1={node.y} x2={node.x + node.width} y2={node.y + node.height} stroke={node.stroke ?? node.color} strokeWidth={node.strokeWidth ?? 2} strokeLinecap="round" markerEnd={node.type === 'arrow' ? 'url(#arrow-head)' : undefined} /></g>
  return <g {...common}>{selection}<path d={roundedRectPath(node)} fill={node.fill} stroke={node.stroke ?? (node.type === 'frame' ? '#cbd5e1' : 'none')} strokeWidth={node.strokeWidth ?? (node.type === 'frame' ? 1 : 0)} />{node.type === 'frame' && <><rect x={node.x + node.width / 2 - 46} y={node.y + 12} width="92" height="25" rx="13" fill="#101828" /><text x={node.x + 16} y={node.y + 70} fill="#64748b" fontSize="12" fontWeight="600">{node.name}</text></>}{node.text && <text x={textX} y={node.y + node.height / 2 + 5} fill={node.color} fontSize={node.fontSize ?? 16} fontWeight={node.fontWeight ?? 650} textAnchor={svgAnchor}>{node.text}</text>}</g>
}

function TextEditor({ node, viewport, onCommit, onCancel }: { node: DesignNode; viewport: Viewport; onCommit: (node: DesignNode, text: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(node.text ?? '')
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') { event.preventDefault(); onCancel() }
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onCommit(node, value) }
  }
  const visibleWidth = CANVAS_WIDTH / viewport.zoom
  const visibleHeight = CANVAS_HEIGHT / viewport.zoom
  return <textarea autoFocus className="canvas-text-editor" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={keyDown} onBlur={() => onCommit(node, value)} style={{ left: `${(node.x - viewport.x) / visibleWidth * 100}%`, top: `${(node.y - viewport.y) / visibleHeight * 100}%`, width: `${node.width / visibleWidth * 100}%`, height: `${node.height / visibleHeight * 100}%`, color: node.color, fontSize: `${(node.fontSize ?? 16) * viewport.zoom}px`, fontWeight: node.fontWeight ?? 400, textAlign: node.textAlign ?? 'left' }} />
}

function ResizeHandles({ node, zoom, onPointerDown, onRotate }: { node: DesignNode; zoom: number; onPointerDown: (event: PointerEvent<SVGRectElement>, corner: ResizeCorner, node: DesignNode) => void; onRotate: (event: PointerEvent<SVGCircleElement>, node: DesignNode) => void }) {
  const size = 10 / zoom
  const positions: Record<ResizeCorner, Point> = { nw: { x: node.x, y: node.y }, ne: { x: node.x + node.width, y: node.y }, se: { x: node.x + node.width, y: node.y + node.height }, sw: { x: node.x, y: node.y + node.height } }
  const centerX = node.x + node.width / 2
  const rotationY = node.y - 28 / zoom
  const transform = node.rotation ? `rotate(${node.rotation} ${centerX} ${node.y + node.height / 2})` : undefined
  return <g transform={transform}><line className="rotation-stem" x1={centerX} y1={node.y} x2={centerX} y2={rotationY} /><circle className="rotation-handle" cx={centerX} cy={rotationY} r={5 / zoom} onPointerDown={(event) => onRotate(event, node)} />{(Object.entries(positions) as Array<[ResizeCorner, Point]>).map(([corner, point]) => <rect key={corner} className={`resize-handle resize-${corner}`} x={point.x - size / 2} y={point.y - size / 2} width={size} height={size} rx="2" onPointerDown={(event) => onPointerDown(event, corner, node)} />)}</g>
}

function resizedBounds(origin: Bounds, corner: ResizeCorner, dx: number, dy: number, lockRatio: boolean): Bounds {
  let width = origin.width + (corner.includes('e') ? dx : -dx)
  let height = origin.height + (corner.includes('s') ? dy : -dy)
  if (lockRatio) {
    const scale = Math.max(width / origin.width, height / origin.height)
    width = origin.width * scale
    height = origin.height * scale
  }
  width = Math.max(24, width); height = Math.max(24, height)
  return { x: corner.includes('w') ? origin.x + origin.width - width : origin.x, y: corner.includes('n') ? origin.y + origin.height - height : origin.y, width, height }
}

function boundsFromPoints(a: Point, b: Point): Bounds { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) } }
function intersects(a: Bounds, b: Bounds) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y }
function clamp(value: number, min: number, max: number) { return Math.min(Math.max(value, min), max) }
function angleFromNodeCenter(node: DesignNode, point: Point) { return Math.atan2(point.y - (node.y + node.height / 2), point.x - (node.x + node.width / 2)) * 180 / Math.PI }
function normalizeAngle(angle: number) { return ((angle + 180) % 360 + 360) % 360 - 180 }
function isTyping(target: EventTarget | null) { return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable) }
function roundedRectPath(node: DesignNode) { const max = Math.min(node.width, node.height) / 2; const radii = node.radius ?? { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }; const tl = Math.min(radii.topLeft, max); const tr = Math.min(radii.topRight, max); const br = Math.min(radii.bottomRight, max); const bl = Math.min(radii.bottomLeft, max); const right = node.x + node.width; const bottom = node.y + node.height; return `M ${node.x + tl} ${node.y} H ${right - tr} Q ${right} ${node.y} ${right} ${node.y + tr} V ${bottom - br} Q ${right} ${bottom} ${right - br} ${bottom} H ${node.x + bl} Q ${node.x} ${bottom} ${node.x} ${bottom - bl} V ${node.y + tl} Q ${node.x} ${node.y} ${node.x + tl} ${node.y} Z` }

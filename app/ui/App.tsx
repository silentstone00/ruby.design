import { useEffect, useMemo, useRef, useState } from 'react'
import { DesignCanvas } from '../canvas/DesignCanvas'
import { createCanvasContext, type CanvasContext } from '../canvas/canvasContext'
import { createStarterScene, IPHONE_16, IPHONE_16_PRO, type DesignScene } from '../document/scene'
import type { CornerRadii, DesignNode } from '../document/scene'
import { parseDesignCommand } from '../intelligence/commandParser'
import { applySceneOperations } from '../operations/applySceneOperations'
import type { OperationResult } from '../operations/types'
import { resolveReferences } from '../referenceResolver/referenceResolver'
import { loadSnapshot, saveSnapshot } from '../persistence/localStorage'
import { TranscriptPanel } from './TranscriptPanel'
import { Toolbar } from './Toolbar'
import type { InsertableNode } from './Toolbar'
import { Inspector } from './Inspector'
import { LayersPanel } from './LayersPanel'

export function App() {
  const [scene, setScene] = useState<DesignScene>(createStarterScene)
  const [selectedIds, setSelectedIds] = useState<string[]>(['primary-button'])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [history, setHistory] = useState<OperationResult[]>([])
  const [undoStack, setUndoStack] = useState<DesignScene[]>([])
  const [redoStack, setRedoStack] = useState<DesignScene[]>([])
  const interactionStart = useRef<{ scene: DesignScene; changed: boolean } | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const context: CanvasContext = useMemo(() => createCanvasContext(scene, selectedIds, hoveredId, history), [scene, selectedIds, hoveredId, history])

  function runCommand(command: string) {
    const parsed = parseDesignCommand(command, context)
    const resolved = resolveReferences(parsed.operations, context)
    const { scene: next, result } = applySceneOperations(scene, resolved.operations, command)
    if (resolved.message && !result.ok) result.message = resolved.message
    if (result.ok) { setUndoStack((items) => [...items, scene]); setRedoStack([]); setScene(next) }
    setHistory((items) => [result, ...items].slice(0, 24))
  }

  function saveDocument() {
    saveSnapshot(scene)
  }

  function loadDocument() {
    const saved = loadSnapshot()
    if (saved) { setUndoStack((items) => [...items, scene]); setScene(saved); setSelectedIds([]) }
  }

  function undo() {
    const previous = undoStack.at(-1)
    if (!previous) return
    setUndoStack((items) => items.slice(0, -1)); setRedoStack((items) => [...items, scene]); setScene(previous)
  }

  function redo() {
    const next = redoStack.at(-1)
    if (!next) return
    setRedoStack((items) => items.slice(0, -1)); setUndoStack((items) => [...items, scene]); setScene(next)
  }

  function beginInteraction() { if (!interactionStart.current) interactionStart.current = { scene: structuredClone(scene), changed: false } }
  function markInteractionChanged() { if (interactionStart.current) interactionStart.current.changed = true }
  function finishInteraction() { const start = interactionStart.current; if (!start) return; interactionStart.current = null; if (start.changed) { setUndoStack((items) => [...items, start.scene]); setRedoStack([]) } }

  function moveNodes(ids: string[], dx: number, dy: number, phase: 'start' | 'move' | 'end') {
    if (phase === 'start') beginInteraction()
    if (phase === 'move') {
      const groupIds = new Set(scene.nodes.filter((node) => ids.includes(node.id)).map((node) => node.groupId).filter(Boolean))
      const candidateIds = new Set(scene.nodes.filter((node) => ids.includes(node.id) || (node.groupId && groupIds.has(node.groupId))).map((node) => node.id))
      const movableIds = new Set([...candidateIds].filter((id) => !hasSelectedAncestor(scene, id, candidateIds)))
      markInteractionChanged()
      setScene((current) => ({ nodes: current.nodes.map((node) => movableIds.has(node.id) ? { ...node, x: node.x + dx, y: node.y + dy } : node) }))
    }
    if (phase === 'end') {
      setScene((current) => reparentDroppedNodes(current, ids))
      finishInteraction()
    }
  }

  function resizeNode(id: string, bounds: { x: number; y: number; width: number; height: number }, phase: 'start' | 'move' | 'end') {
    if (phase === 'start') beginInteraction()
    if (phase === 'move') { markInteractionChanged(); setScene((current) => ({ nodes: current.nodes.map((node) => node.id === id ? { ...node, ...bounds } : node) })) }
    if (phase === 'end') finishInteraction()
  }

  function rotateNode(id: string, rotation: number, phase: 'start' | 'move' | 'end') {
    if (phase === 'start') beginInteraction()
    if (phase === 'move') { markInteractionChanged(); setScene((current) => ({ nodes: current.nodes.map((node) => node.id === id ? { ...node, rotation } : node) })) }
    if (phase === 'end') finishInteraction()
  }

  function updateSelectedRadius(radius: CornerRadii) {
    const selectedId = selectedIds.at(-1)
    if (!selectedId) return
    setUndoStack((items) => [...items, scene])
    setRedoStack([])
    setScene((current) => ({ nodes: current.nodes.map((node) => node.id === selectedId ? { ...node, radius } : node) }))
  }

  function updateNode(id: string, patch: Partial<DesignScene['nodes'][number]>) {
    setUndoStack((items) => [...items, scene])
    setRedoStack([])
    setScene((current) => ({ nodes: current.nodes.map((node) => node.id === id ? { ...node, ...patch } : node) }))
  }

  function updateSelectedNode(patch: Partial<DesignScene['nodes'][number]>) {
    const selectedId = selectedIds.at(-1)
    if (selectedId) updateNode(selectedId, patch)
  }

  function commitScene(next: DesignScene, nextSelection = selectedIds) {
    setUndoStack((items) => [...items, scene])
    setRedoStack([])
    setScene(next)
    setSelectedIds(nextSelection)
  }

  function duplicateSelection() {
    const selectedRoots = selectedIds.filter((id) => !hasSelectedAncestor(scene, id, new Set(selectedIds)))
    const copiedIds = new Set(scene.nodes.filter((node) => selectedRoots.some((rootId) => node.id === rootId || hasAncestor(scene, node.id, rootId))).map((node) => node.id))
    const idMap = new Map([...copiedIds].map((id) => [id, crypto.randomUUID()]))
    const copies = scene.nodes.filter((node) => copiedIds.has(node.id)).map((node) => ({ ...structuredClone(node), id: idMap.get(node.id)!, name: selectedRoots.includes(node.id) ? `${node.name} copy` : node.name, x: selectedRoots.includes(node.id) ? node.x + 24 : node.x, y: selectedRoots.includes(node.id) ? node.y + 24 : node.y, parentId: node.parentId ? idMap.get(node.parentId) ?? node.parentId : undefined, groupId: undefined }))
    if (copies.length) commitScene({ nodes: [...scene.nodes, ...copies] }, copies.map((node) => node.id))
  }

  function deleteSelection() {
    if (!selectedIds.length) return
    const deletedIds = new Set(scene.nodes.filter((node) => selectedIds.some((id) => node.id === id || hasAncestor(scene, node.id, id))).map((node) => node.id))
    commitScene({ nodes: scene.nodes.filter((node) => !deletedIds.has(node.id)) }, [])
  }

  function groupSelection() {
    if (selectedIds.length < 2) return
    const groupId = crypto.randomUUID()
    commitScene({ nodes: scene.nodes.map((node) => selectedIds.includes(node.id) ? { ...node, groupId } : node) })
  }

  function ungroupSelection() {
    const groupIds = new Set(scene.nodes.filter((node) => selectedIds.includes(node.id)).map((node) => node.groupId).filter(Boolean))
    if (!groupIds.size) return
    commitScene({ nodes: scene.nodes.map((node) => node.groupId && groupIds.has(node.groupId) ? { ...node, groupId: undefined } : node) })
  }

  function reorderSelection(mode: 'front' | 'back') {
    const chosen = scene.nodes.filter((node) => selectedIds.includes(node.id))
    if (!chosen.length) return
    const other = scene.nodes.filter((node) => !selectedIds.includes(node.id))
    commitScene({ nodes: mode === 'front' ? [...other, ...chosen] : [...chosen, ...other] })
  }

  function insertNode(type: InsertableNode) {
    const parent = type === 'custom-frame' || type.startsWith('iphone-') ? undefined : findContainingFrame(scene, selectedIds.at(-1))
    const defaults = insertionDefaults(type, parent)
    const node = { id: crypto.randomUUID(), parentId: parent?.id, ...defaults }
    commitScene({ nodes: [...scene.nodes, node] }, [node.id])
  }

  async function insertImage(file: File) {
    const parent = findContainingFrame(scene, selectedIds.at(-1))
    const { src, width, height } = await readImageFile(file)
    const node = { id: crypto.randomUUID(), parentId: parent?.id, ...imageInsertionDefaults(file.name, src, { width, height }, parent) }
    commitScene({ nodes: [...scene.nodes, node] }, [node.id])
  }

  function selectNode(id: string | null, modifiers?: { toggle: boolean }) {
    if (!id) { setSelectedIds([]); return }
    setSelectedIds((current) => modifiers?.toggle ? (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) : [id])
  }
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      const modifier = event.metaKey || event.ctrlKey
      if (modifier && event.key.toLowerCase() === 'a') { event.preventDefault(); setSelectedIds(scene.nodes.map((node) => node.id)) }
      if (modifier && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelection() }
      if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo() }
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelection() }
      if (event.key === 'Escape') setSelectedIds([])
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  }, [scene, selectedIds, undoStack, redoStack])
  const selectedNode = scene.nodes.find((node) => node.id === selectedIds.at(-1)) ?? null

  return (
    <main className="app-shell">
      <input ref={imageInputRef} className="visually-hidden" type="file" accept="image/*" onChange={(event) => {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        if (file) void insertImage(file)
      }} />
      <section className="canvas-stage" aria-label="Design canvas">
        <DesignCanvas scene={scene} selectedIds={selectedIds} onSelect={selectNode} onSelectMany={setSelectedIds} onHover={setHoveredId} onMove={moveNodes} onResize={resizeNode} onRotate={rotateNode} onTextCommit={(id, text) => updateNode(id, { text })} />
        <LayersPanel scene={scene} selectedId={selectedNode?.id ?? null} onSelect={(id) => selectNode(id)} />
      </section>
      <aside className="side-panel" aria-label="Voice command controls">
        <Toolbar
          canRun={true}
          onUndo={undo}
          onRedo={redo}
          onSave={saveDocument}
          onLoad={loadDocument}
          hasSelection={selectedIds.length > 0}
          canGroup={selectedIds.length > 1}
          canUngroup={scene.nodes.some((node) => selectedIds.includes(node.id) && Boolean(node.groupId))}
          onDuplicate={duplicateSelection}
          onDelete={deleteSelection}
          onGroup={groupSelection}
          onUngroup={ungroupSelection}
          onBringToFront={() => reorderSelection('front')}
          onSendToBack={() => reorderSelection('back')}
          onInsert={insertNode}
          onInsertImage={() => imageInputRef.current?.click()}
        />
        <Inspector node={selectedNode} onRadiusChange={updateSelectedRadius} onUpdate={updateSelectedNode} />
        <TranscriptPanel onSubmit={runCommand} history={history} context={context} />
      </aside>
    </main>
  )
}

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)
}

function hasSelectedAncestor(scene: DesignScene, id: string, selectedIds: Set<string>) {
  let parentId = scene.nodes.find((node) => node.id === id)?.parentId
  const visited = new Set<string>()
  while (parentId && !visited.has(parentId)) {
    if (selectedIds.has(parentId)) return true
    visited.add(parentId)
    parentId = scene.nodes.find((node) => node.id === parentId)?.parentId
  }
  return false
}

function hasAncestor(scene: DesignScene, id: string, ancestorId: string) {
  return hasSelectedAncestor(scene, id, new Set([ancestorId]))
}

function reparentDroppedNodes(scene: DesignScene, ids: string[]): DesignScene {
  const draggedIds = new Set(ids)
  const roots = scene.nodes.filter((node) => draggedIds.has(node.id) && !hasSelectedAncestor(scene, node.id, draggedIds))
  let changed = false
  const nextNodes = scene.nodes.map((node) => {
    if (!roots.some((root) => root.id === node.id)) return node
    const world = worldPosition(scene, node)
    const center = { x: world.x + node.width / 2, y: world.y + node.height / 2 }
    const target = scene.nodes
      .filter((candidate) => candidate.type === 'frame' && candidate.id !== node.id && !hasAncestor(scene, candidate.id, node.id))
      .map((candidate) => ({ node: candidate, world: worldPosition(scene, candidate) }))
      .filter(({ node: candidate, world: frame }) => center.x >= frame.x && center.x <= frame.x + candidate.width && center.y >= frame.y && center.y <= frame.y + candidate.height)
      .sort((a, b) => a.node.width * a.node.height - b.node.width * b.node.height)[0]

    if (target?.node.id === node.parentId) return node
    changed = true
    if (!target) return { ...node, parentId: undefined, x: world.x, y: world.y }
    return { ...node, parentId: target.node.id, x: world.x - target.world.x, y: world.y - target.world.y }
  })
  return changed ? { nodes: nextNodes } : scene
}

function worldPosition(scene: DesignScene, node: DesignNode) {
  let x = node.x
  let y = node.y
  let parentId = node.parentId
  const visited = new Set([node.id])
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    const parent = scene.nodes.find((candidate) => candidate.id === parentId)
    if (!parent) break
    x += parent.x
    y += parent.y
    parentId = parent.parentId
  }
  return { x, y }
}

function findContainingFrame(scene: DesignScene, id: string | undefined) {
  let node = scene.nodes.find((item) => item.id === id)
  const visited = new Set<string>()
  while (node && !visited.has(node.id)) {
    if (node.type === 'frame') return node
    visited.add(node.id)
    node = scene.nodes.find((item) => item.id === node?.parentId)
  }
  return undefined
}

function insertionDefaults(type: InsertableNode, parent: DesignScene['nodes'][number] | undefined): Omit<DesignScene['nodes'][number], 'id' | 'parentId'> {
  const offset = parent ? { x: Math.max(24, (parent.width - 240) / 2), y: Math.max(96, (parent.height - 56) / 2) } : { x: 180, y: 180 }
  if (type === 'custom-frame') return { type: 'frame', name: 'Custom frame', ...offset, width: 320, height: 568, fill: '#ffffff', color: '#101828', stroke: '#cbd5e1', strokeWidth: 1, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }, clipContent: true }
  if (type === 'iphone-16-pro' || type === 'iphone-16') {
    const device = type === 'iphone-16-pro' ? IPHONE_16_PRO : IPHONE_16
    return { type: 'frame', name: type === 'iphone-16-pro' ? 'iPhone 16 Pro' : 'iPhone 16', x: 180, y: 180, width: device.width, height: device.height, fill: '#ffffff', color: '#101828', stroke: '#cbd5e1', strokeWidth: 1, preset: type, radius: { topLeft: 54, topRight: 54, bottomRight: 54, bottomLeft: 54 }, clipContent: true }
  }
  if (type === 'text') return { type: 'text', name: 'Text', ...offset, width: 240, height: 40, fill: 'transparent', color: '#101828', text: 'Text', fontSize: 24, fontWeight: 600, textAlign: 'left' }
  return { type: 'rect', name: 'Rectangle', ...offset, width: 240, height: 120, fill: '#dbeafe', color: '#101828', radius: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 } }
}

function imageInsertionDefaults(name: string, imageSrc: string, imageSize: { width: number; height: number }, parent: DesignNode | undefined): Omit<DesignNode, 'id' | 'parentId'> {
  const maxWidth = parent ? Math.max(120, parent.width - 48) : 320
  const maxHeight = parent ? Math.max(120, parent.height - 192) : 240
  const scale = Math.min(maxWidth / imageSize.width, maxHeight / imageSize.height, 1)
  const width = Math.max(80, Math.round(imageSize.width * scale))
  const height = Math.max(80, Math.round(imageSize.height * scale))
  const x = parent ? Math.max(24, (parent.width - width) / 2) : 180
  const y = parent ? Math.max(96, (parent.height - height) / 2) : 180
  return { type: 'image', name: name.replace(/\.[^.]+$/, '') || 'Image', x, y, width, height, fill: 'transparent', color: '#101828', imageSrc, imageSize, imageCrop: { x: 0, y: 0, width: 1, height: 1 }, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 } }
}

function readImageFile(file: File): Promise<{ src: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the selected image.'))
    reader.onload = () => {
      const src = String(reader.result)
      const image = new Image()
      image.onerror = () => reject(new Error('The selected file is not a supported image.'))
      image.onload = () => resolve({ src, width: image.naturalWidth, height: image.naturalHeight })
      image.src = src
    }
    reader.readAsDataURL(file)
  })
}

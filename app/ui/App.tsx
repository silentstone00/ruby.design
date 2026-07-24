import { useEffect, useMemo, useRef, useState } from 'react'
import { DesignCanvas } from '../canvas/DesignCanvas'
import { createCanvasContext, type CanvasContext } from '../canvas/canvasContext'
import { createStarterScene, type DesignScene } from '../document/scene'
import type { CornerRadii } from '../document/scene'
import { parseDesignCommand } from '../intelligence/commandParser'
import { applySceneOperations } from '../operations/applySceneOperations'
import type { OperationResult } from '../operations/types'
import { resolveReferences } from '../referenceResolver/referenceResolver'
import { loadSnapshot, saveSnapshot } from '../persistence/localStorage'
import { TranscriptPanel } from './TranscriptPanel'
import { Toolbar } from './Toolbar'
import { Inspector } from './Inspector'

export function App() {
  const [scene, setScene] = useState<DesignScene>(createStarterScene)
  const [selectedIds, setSelectedIds] = useState<string[]>(['primary-button'])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [history, setHistory] = useState<OperationResult[]>([])
  const [undoStack, setUndoStack] = useState<DesignScene[]>([])
  const [redoStack, setRedoStack] = useState<DesignScene[]>([])
  const interactionStart = useRef<{ scene: DesignScene; changed: boolean } | null>(null)
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
      const movableIds = new Set(scene.nodes.filter((node) => ids.includes(node.id) || (node.groupId && groupIds.has(node.groupId))).map((node) => node.id))
      markInteractionChanged()
      setScene((current) => ({ nodes: current.nodes.map((node) => movableIds.has(node.id) ? { ...node, x: node.x + dx, y: node.y + dy } : node) }))
    }
    if (phase === 'end') finishInteraction()
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
    const copies = scene.nodes.filter((node) => selectedIds.includes(node.id)).map((node) => ({ ...structuredClone(node), id: crypto.randomUUID(), name: `${node.name} copy`, x: node.x + 24, y: node.y + 24, groupId: undefined }))
    if (copies.length) commitScene({ nodes: [...scene.nodes, ...copies] }, copies.map((node) => node.id))
  }

  function deleteSelection() {
    if (!selectedIds.length) return
    commitScene({ nodes: scene.nodes.filter((node) => !selectedIds.includes(node.id)) }, [])
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
      <section className="canvas-stage" aria-label="Design canvas">
        <DesignCanvas scene={scene} selectedIds={selectedIds} onSelect={selectNode} onSelectMany={setSelectedIds} onHover={setHoveredId} onMove={moveNodes} onResize={resizeNode} onRotate={rotateNode} onTextCommit={(id, text) => updateNode(id, { text })} />
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

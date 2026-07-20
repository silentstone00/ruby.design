import { useState } from 'react'
import type { Editor } from 'tldraw'
import { TldrawCanvas } from '../canvas/TldrawCanvas'
import { createCanvasContext, type CanvasContext } from '../canvas/canvasContext'
import { parseDesignCommand } from '../intelligence/commandParser'
import { applyDesignOperations } from '../operations/applyOperations'
import type { OperationResult } from '../operations/types'
import { resolveReferences } from '../referenceResolver/referenceResolver'
import { loadSnapshot, saveSnapshot } from '../persistence/localStorage'
import { TranscriptPanel } from './TranscriptPanel'
import { Toolbar } from './Toolbar'

export function App() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [history, setHistory] = useState<OperationResult[]>([])
  const [context, setContext] = useState<CanvasContext | null>(null)

  function refreshContext(nextEditor = editor, nextHoveredId = hoveredId, nextHistory = history) {
    if (!nextEditor) return
    setContext(createCanvasContext(nextEditor, nextHoveredId, nextHistory))
  }

  function handleEditorReady(nextEditor: Editor) {
    setEditor(nextEditor)
    setContext(createCanvasContext(nextEditor, hoveredId, history))
  }

  function handleHoverShape(shapeId: string | null) {
    setHoveredId(shapeId)
    refreshContext(editor, shapeId, history)
  }

  function runCommand(command: string) {
    if (!editor || !context) return

    const parsed = parseDesignCommand(command, context)
    const resolved = resolveReferences(parsed.operations, context)
    const result = applyDesignOperations(editor, resolved.operations, command, resolved.message)
    setHistory((items) => {
      const nextHistory = [result, ...items].slice(0, 24)
      setContext(createCanvasContext(editor, hoveredId, nextHistory))
      return nextHistory
    })
  }

  function saveDocument() {
    if (!editor) return
    saveSnapshot(editor)
    refreshContext()
  }

  function loadDocument() {
    if (!editor) return
    loadSnapshot(editor)
    refreshContext()
  }

  function undo() {
    editor?.undo()
    refreshContext()
  }

  function redo() {
    editor?.redo()
    refreshContext()
  }

  return (
    <main className="app-shell">
      <section className="canvas-stage" aria-label="Design canvas">
        <TldrawCanvas onEditorReady={handleEditorReady} onHoverShape={handleHoverShape} />
      </section>
      <aside className="side-panel" aria-label="Voice command controls">
        <Toolbar
          canRun={Boolean(editor)}
          onUndo={undo}
          onRedo={redo}
          onSave={saveDocument}
          onLoad={loadDocument}
        />
        <TranscriptPanel onSubmit={runCommand} history={history} context={context} />
      </aside>
    </main>
  )
}

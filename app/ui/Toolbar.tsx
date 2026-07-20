import { Download, Redo2, Save, Undo2, Upload } from 'lucide-react'

type ToolbarProps = {
  canRun: boolean
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onLoad: () => void
}

export function Toolbar({ canRun, onUndo, onRedo, onSave, onLoad }: ToolbarProps) {
  return (
    <div className="toolbar">
      <button disabled={!canRun} onClick={onUndo} title="Undo" aria-label="Undo">
        <Undo2 size={18} />
      </button>
      <button disabled={!canRun} onClick={onRedo} title="Redo" aria-label="Redo">
        <Redo2 size={18} />
      </button>
      <span className="toolbar-spacer" />
      <button disabled={!canRun} onClick={onSave} title="Save" aria-label="Save document">
        <Save size={18} />
      </button>
      <button disabled={!canRun} onClick={onLoad} title="Load" aria-label="Load document">
        <Upload size={18} />
      </button>
      <button disabled={!canRun} onClick={() => window.print()} title="Export" aria-label="Export view">
        <Download size={18} />
      </button>
    </div>
  )
}

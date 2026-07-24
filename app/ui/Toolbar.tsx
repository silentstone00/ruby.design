import { ArrowDownToLine, ArrowUpToLine, Copy, Download, Layers3, Redo2, Save, Trash2, Undo2, Unlink2, Upload } from 'lucide-react'

type ToolbarProps = {
  canRun: boolean
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onLoad: () => void
  canGroup: boolean
  canUngroup: boolean
  hasSelection: boolean
  onDuplicate: () => void
  onDelete: () => void
  onGroup: () => void
  onUngroup: () => void
  onBringToFront: () => void
  onSendToBack: () => void
}

export function Toolbar({ canRun, onUndo, onRedo, onSave, onLoad, canGroup, canUngroup, hasSelection, onDuplicate, onDelete, onGroup, onUngroup, onBringToFront, onSendToBack }: ToolbarProps) {
  return (
    <div className="toolbar">
      <button disabled={!canRun} onClick={onUndo} title="Undo" aria-label="Undo">
        <Undo2 size={18} />
      </button>
      <button disabled={!canRun} onClick={onRedo} title="Redo" aria-label="Redo">
        <Redo2 size={18} />
      </button>
      <span className="toolbar-divider" />
      <button disabled={!hasSelection} onClick={onDuplicate} title="Duplicate" aria-label="Duplicate">
        <Copy size={17} />
      </button>
      <button disabled={!hasSelection} onClick={onDelete} title="Delete" aria-label="Delete">
        <Trash2 size={17} />
      </button>
      <button disabled={!canGroup} onClick={onGroup} title="Group selection" aria-label="Group selection">
        <Layers3 size={17} />
      </button>
      <button disabled={!canUngroup} onClick={onUngroup} title="Ungroup selection" aria-label="Ungroup selection">
        <Unlink2 size={17} />
      </button>
      <button disabled={!hasSelection} onClick={onBringToFront} title="Bring to front" aria-label="Bring to front">
        <ArrowUpToLine size={17} />
      </button>
      <button disabled={!hasSelection} onClick={onSendToBack} title="Send to back" aria-label="Send to back">
        <ArrowDownToLine size={17} />
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

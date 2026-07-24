import { ArrowDownToLine, ArrowUpToLine, Component, Copy, Download, Frame, Image, Layers3, Plus, Redo2, Save, Smartphone, Square, Trash2, Type, Undo2, Unlink2, Upload } from 'lucide-react'
import { useState } from 'react'

export type InsertableNode = 'custom-frame' | 'iphone-16-pro' | 'iphone-16' | 'text' | 'rect'

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
  onInsert: (type: InsertableNode) => void
  onInsertImage: () => void
}

export function Toolbar({ canRun, onUndo, onRedo, onSave, onLoad, canGroup, canUngroup, hasSelection, onDuplicate, onDelete, onGroup, onUngroup, onBringToFront, onSendToBack, onInsert, onInsertImage }: ToolbarProps) {
  const [insertOpen, setInsertOpen] = useState(false)

  function insert(type: InsertableNode) {
    onInsert(type)
    setInsertOpen(false)
  }

  return (
    <div className="toolbar">
      <div className="insert-menu">
        <button onClick={() => setInsertOpen((open) => !open)} title="Insert" aria-label="Insert" aria-expanded={insertOpen}>
          <Plus size={18} />
        </button>
        {insertOpen && <div className="insert-popover" role="menu" aria-label="Insert items">
          <button role="menuitem" onClick={() => insert('custom-frame')}><Frame size={16} /><span>Custom frame</span></button>
          <div className="insert-device-group" role="group" aria-label="iPhone frames">
            <span>iPhone</span>
            <button role="menuitem" onClick={() => insert('iphone-16-pro')}><Smartphone size={16} /><span>iPhone 16 Pro</span></button>
            <button role="menuitem" onClick={() => insert('iphone-16')}><Smartphone size={16} /><span>iPhone 16</span></button>
          </div>
          <button role="menuitem" onClick={() => insert('text')}><Type size={16} /><span>Text</span></button>
          <button role="menuitem" onClick={() => insert('rect')}><Square size={16} /><span>Rectangle</span></button>
          <button role="menuitem" onClick={() => { onInsertImage(); setInsertOpen(false) }}><Image size={16} /><span>Image</span></button>
          <button role="menuitem" disabled title="Component libraries are not implemented yet"><Component size={16} /><span>Component</span></button>
        </div>}
      </div>
      <span className="toolbar-divider" />
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

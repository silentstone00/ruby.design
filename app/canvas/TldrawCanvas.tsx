import { useEffect } from 'react'
import { Tldraw, type Editor } from 'tldraw'

type TldrawCanvasProps = {
  onEditorReady: (editor: Editor) => void
  onHoverShape: (shapeId: string | null) => void
}

export function TldrawCanvas({ onEditorReady, onHoverShape }: TldrawCanvasProps) {
  function handleMount(editor: Editor) {
    onEditorReady(editor)
    seedDocument(editor)
  }

  return (
    <div className="canvas-root">
      <Tldraw onMount={handleMount}>
        <HoverTracker onHoverShape={onHoverShape} />
      </Tldraw>
    </div>
  )
}

function HoverTracker({ onHoverShape }: { onHoverShape: (shapeId: string | null) => void }) {
  useEffect(() => {
    const handler = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      const shapeElement = target?.closest('[data-shape-id]') as HTMLElement | null
      onHoverShape(shapeElement?.dataset.shapeId ?? null)
    }

    window.addEventListener('pointermove', handler)
    window.addEventListener('pointerleave', () => onHoverShape(null))

    return () => {
      window.removeEventListener('pointermove', handler)
      window.removeEventListener('pointerleave', () => onHoverShape(null))
    }
  }, [onHoverShape])

  return null
}

function seedDocument(editor: Editor) {
  if (editor.getCurrentPageShapes().length > 0) return

  editor.run(
    () => {
      editor.createShapes([
        {
          type: 'geo',
          x: 120,
          y: 120,
          props: { w: 220, h: 120, geo: 'rectangle', color: 'blue', fill: 'solid' },
        },
        {
          type: 'text',
          x: 150,
          y: 155,
          props: { richText: { type: 'doc', content: [{ type: 'paragraph' }] }, color: 'white' },
        },
      ])
      editor.zoomToFit()
    },
    { history: 'ignore' },
  )
}

import { createShapeId, type Editor, type TLShapeId } from 'tldraw'
import { toRichText } from 'tldraw'
import type { DesignOperation, OperationResult, ShapeKind, ShapeProps } from './types'

export function applyDesignOperations(
  editor: Editor,
  operations: DesignOperation[],
  command: string,
  preflightMessage?: string,
): OperationResult {
  const result: OperationResult = {
    id: crypto.randomUUID(),
    ok: false,
    command,
    operations,
    message: preflightMessage ?? 'No operation applied.',
    createdAt: Date.now(),
  }

  if (operations.length === 0) return result

  try {
    editor.markHistoryStoppingPoint(`voice command: ${command}`)
    editor.run(() => {
      for (const operation of operations) {
        applyOne(editor, operation)
      }
    })
    result.ok = true
    result.message = preflightMessage ?? summarizeOperations(operations)
    return result
  } catch (error) {
    result.message = error instanceof Error ? error.message : 'Command failed.'
    return result
  }
}

function applyOne(editor: Editor, operation: DesignOperation) {
  switch (operation.type) {
    case 'create_shape':
      editor.createShape(toTldrawShape(operation.shape, operation.props))
      return
    case 'set_text':
      editor.updateShape({
        id: toShapeId(operation.targetId),
        type: 'text',
        props: { richText: toRichText(operation.text) },
      })
      return
    case 'set_prop':
      updateShapeProp(editor, operation.targetId, operation.path, operation.value)
      return
    case 'move': {
      const shape = editor.getShape(toShapeId(operation.targetId))
      if (!shape) throw new Error(`Could not find ${operation.targetId}.`)
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        x: shape.x + operation.dx,
        y: shape.y + operation.dy,
      })
      return
    }
    case 'resize': {
      const shape = editor.getShape(toShapeId(operation.targetId))
      if (!shape) throw new Error(`Could not find ${operation.targetId}.`)
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        props: {
          ...(operation.width ? { w: operation.width } : {}),
          ...(operation.height ? { h: operation.height } : {}),
        },
      })
      return
    }
    case 'align':
      editor.alignShapes(operation.targetIds.map(toShapeId), toTldrawAlignMode(operation.mode))
      return
    case 'reorder':
      reorder(editor, operation.targetId, operation.mode)
      return
    case 'group':
      editor.groupShapes(operation.targetIds.map(toShapeId))
      return
    case 'undo':
      editor.undo()
      return
    case 'redo':
      editor.redo()
      return
  }
}

function toTldrawShape(shape: ShapeKind, props: ShapeProps) {
  const id = createShapeId()
  const x = props.x ?? 160
  const y = props.y ?? 160
  const w = props.width ?? 180
  const h = props.height ?? (shape === 'text' ? 56 : 104)

  if (shape === 'text') {
    return {
      id,
      type: 'text' as const,
      x,
      y,
      props: {
        richText: toRichText(props.text ?? 'New text'),
        color: props.color ?? 'black',
        size: 'm',
      },
    }
  }

  if (shape === 'arrow') {
    return {
      id,
      type: 'arrow' as const,
      x,
      y,
      props: {
        start: { x: 0, y: 0 },
        end: { x: w, y: h },
        color: props.color ?? 'black',
      },
    }
  }

  return {
    id,
    type: 'geo' as const,
    x,
    y,
    props: {
      w,
      h,
      geo: shape === 'ellipse' ? 'ellipse' : 'rectangle',
      color: props.color ?? 'black',
      fill: props.fill ?? 'solid',
    },
  }
}

function updateShapeProp(editor: Editor, targetId: string, path: string, value: unknown) {
  const shape = editor.getShape(toShapeId(targetId))
  if (!shape) throw new Error(`Could not find ${targetId}.`)

  if (path === 'x' || path === 'y' || path === 'opacity') {
    editor.updateShape({ id: shape.id, type: shape.type, [path]: value })
    return
  }

  const propName = path.replace(/^props\./, '')
  editor.updateShape({
    id: shape.id,
    type: shape.type,
    props: { [propName]: value },
  })
}

function reorder(editor: Editor, targetId: string, mode: 'front' | 'back' | 'forward' | 'backward') {
  const id = toShapeId(targetId)
  if (mode === 'front') editor.bringToFront([id])
  if (mode === 'back') editor.sendToBack([id])
  if (mode === 'forward') editor.bringForward([id])
  if (mode === 'backward') editor.sendBackward([id])
}

function toTldrawAlignMode(mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  if (mode === 'center') return 'center-horizontal'
  if (mode === 'middle') return 'center-vertical'
  return mode
}

function toShapeId(id: string): TLShapeId {
  return id as TLShapeId
}

function summarizeOperations(operations: DesignOperation[]) {
  if (operations.length === 1) return `Applied ${operations[0].type.replace(/_/g, ' ')}.`
  return `Applied ${operations.length} operations.`
}

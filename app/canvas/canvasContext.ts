import type { Editor } from 'tldraw'
import type { OperationResult } from '../operations/types'

export type CanvasShapeSummary = {
  id: string
  type: string
  x: number
  y: number
  width?: number
  height?: number
  props: Record<string, unknown>
}

export type CanvasContext = {
  selectedIds: string[]
  hoverId: string | null
  visibleShapes: CanvasShapeSummary[]
  recentOperations: OperationResult[]
}

export function createCanvasContext(
  editor: Editor,
  hoverId: string | null,
  recentOperations: OperationResult[],
): CanvasContext {
  return {
    selectedIds: editor.getSelectedShapeIds().map(String),
    hoverId,
    visibleShapes: editor.getCurrentPageShapesSorted().map((shape) => ({
      id: String(shape.id),
      type: shape.type,
      x: shape.x,
      y: shape.y,
      width: getNumericProp(shape.props, 'w'),
      height: getNumericProp(shape.props, 'h'),
      props: shape.props as Record<string, unknown>,
    })),
    recentOperations,
  }
}

function getNumericProp(props: object, key: string) {
  const value = (props as Record<string, unknown>)[key]
  return typeof value === 'number' ? value : undefined
}

import type { OperationResult } from '../operations/types'
import type { DesignScene } from '../document/scene'

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
  scene: DesignScene,
  selectedIds: string[],
  hoverId: string | null,
  recentOperations: OperationResult[],
): CanvasContext {
  return {
    selectedIds,
    hoverId,
    visibleShapes: scene.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      props: node as unknown as Record<string, unknown>,
    })),
    recentOperations,
  }
}

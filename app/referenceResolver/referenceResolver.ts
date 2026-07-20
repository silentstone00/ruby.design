import type { CanvasContext, CanvasShapeSummary } from '../canvas/canvasContext'
import type { DesignOperation } from '../operations/types'

const DEICTIC_TARGETS = new Set(['this', 'that', 'it', 'selected', 'hovered'])

export type ResolveResult = {
  operations: DesignOperation[]
  message?: string
}

export function resolveReferences(operations: DesignOperation[], context: CanvasContext): ResolveResult {
  const target = pickBestTarget(context)
  const unresolved = operations.some((operation) => hasDeicticTarget(operation))

  if (unresolved && !target) {
    return {
      operations: [],
      message: 'I need a selected or hovered shape before I can apply that command.',
    }
  }

  return {
    operations: operations.map((operation) => replaceTarget(operation, target?.id)),
    message: unresolved && target ? `Resolved reference to ${target.id}.` : undefined,
  }
}

function pickBestTarget(context: CanvasContext): CanvasShapeSummary | null {
  const selected = context.selectedIds[0]
  if (selected) return context.visibleShapes.find((shape) => shape.id === selected) ?? null

  if (context.hoverId) {
    return context.visibleShapes.find((shape) => shape.id === context.hoverId) ?? null
  }

  const lastCreated = context.recentOperations
    .flatMap((entry) => entry.operations)
    .find((operation) => operation.type === 'create_shape')

  return lastCreated ? context.visibleShapes[context.visibleShapes.length - 1] ?? null : null
}

function hasDeicticTarget(operation: DesignOperation) {
  if ('targetId' in operation) return DEICTIC_TARGETS.has(operation.targetId)
  if ('targetIds' in operation) return operation.targetIds.some((id) => DEICTIC_TARGETS.has(id))
  return false
}

function replaceTarget(operation: DesignOperation, targetId: string | undefined): DesignOperation {
  if (!targetId) return operation

  if ('targetId' in operation && DEICTIC_TARGETS.has(operation.targetId)) {
    return { ...operation, targetId }
  }

  if ('targetIds' in operation) {
    return {
      ...operation,
      targetIds: operation.targetIds.map((id) => (DEICTIC_TARGETS.has(id) ? targetId : id)),
    }
  }

  return operation
}

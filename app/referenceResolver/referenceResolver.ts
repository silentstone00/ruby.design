import type { CanvasContext, CanvasShapeSummary } from '../canvas/canvasContext'
import type { DesignOperation } from '../operations/types'

const DEICTIC_TARGETS = new Set(['this', 'that', 'it', 'selected', 'hovered'])

export type ResolveResult = {
  operations: DesignOperation[]
  message?: string
}

export type ParsedSpatialRelation = {
  relation: 'below' | 'above' | 'right_of' | 'left_of' | 'inside' | 'next_to'
  anchorQuery: string
}

export function resolveReferences(operations: DesignOperation[], context: CanvasContext): ResolveResult {
  const defaultTarget = pickBestTarget(context)
  const resolvedOps: DesignOperation[] = []
  const messages: string[] = []

  for (let op of operations) {
    if ('targetId' in op && op.targetId) {
      const spatial = parseSpatialTarget(op.targetId)
      if (spatial) {
        const anchor = findMatchingShape(spatial.anchorQuery, context.visibleShapes)
        if (anchor) {
          const spatialShape = resolveSpatialShape(spatial.relation, anchor, context.visibleShapes, defaultTarget?.id)
          if (spatialShape) {
            op = { ...op, targetId: spatialShape.id } as DesignOperation
            messages.push(`Resolved reference to ${spatialShape.props.name ?? spatialShape.id} (${spatial.relation} ${anchor.props.name ?? anchor.id}).`)
          } else if (op.type === 'move' && op.dx === 0 && op.dy === 0 && defaultTarget) {
            const placement = calculateRelativePlacement(spatial.relation, anchor, defaultTarget)
            op = { ...op, targetId: defaultTarget.id, dx: placement.dx, dy: placement.dy } as DesignOperation
            messages.push(`Positioned ${defaultTarget.props.name ?? defaultTarget.id} ${spatial.relation} ${anchor.props.name ?? anchor.id}.`)
          }
        }
      } else if (DEICTIC_TARGETS.has(op.targetId)) {
        if (defaultTarget) {
          op = { ...op, targetId: defaultTarget.id } as DesignOperation
        }
      } else {
        const matched = findMatchingShape(op.targetId, context.visibleShapes)
        if (matched) {
          op = { ...op, targetId: matched.id } as DesignOperation
        }
      }
    }

    if ('targetIds' in op && Array.isArray(op.targetIds)) {
      const resolvedIds = op.targetIds.map((id) => {
        if (DEICTIC_TARGETS.has(id)) return defaultTarget?.id ?? id
        const matched = findMatchingShape(id, context.visibleShapes)
        return matched?.id ?? id
      })
      op = { ...op, targetIds: resolvedIds } as DesignOperation
    }

    resolvedOps.push(op)
  }

  const hasUnresolvedDeictic = operations.some((op) => hasDeicticTarget(op)) && !defaultTarget
  if (hasUnresolvedDeictic) {
    return {
      operations: [],
      message: 'I need a selected or hovered shape before I can apply that command.',
    }
  }

  return {
    operations: resolvedOps,
    message: messages.length > 0 ? messages.join(' ') : undefined,
  }
}

export function parseSpatialTarget(raw: string): ParsedSpatialRelation | null {
  const text = raw.toLowerCase().trim()

  const prefixMatch = text.match(/^(below|under|above|over|right_of|left_of|inside|next_to):(.+)$/)
  if (prefixMatch) {
    const rel = prefixMatch[1] === 'under' ? 'below' : prefixMatch[1] === 'over' ? 'above' : (prefixMatch[1] as ParsedSpatialRelation['relation'])
    return { relation: rel, anchorQuery: prefixMatch[2].trim() }
  }

  const phraseMatch = text.match(/(?:(?:move|place|select|make|set)\s+)?(?:the\s+)?(?:shape|button|text|rect|card|box|object|item)?\s*(below|under|above|over|to the right of|right of|to the left of|left of|inside|in|next to)\s+(?:the\s+)?(.+)/)
  if (phraseMatch) {
    const rawRel = phraseMatch[1]
    let relation: ParsedSpatialRelation['relation'] = 'below'
    if (rawRel === 'above' || rawRel === 'over') relation = 'above'
    if (rawRel === 'below' || rawRel === 'under') relation = 'below'
    if (rawRel.includes('right')) relation = 'right_of'
    if (rawRel.includes('left')) relation = 'left_of'
    if (rawRel === 'inside' || rawRel === 'in') relation = 'inside'
    if (rawRel === 'next to') relation = 'next_to'
    return { relation, anchorQuery: phraseMatch[2].trim() }
  }

  return null
}

export function findMatchingShape(query: string, shapes: CanvasShapeSummary[]): CanvasShapeSummary | null {
  const q = query.toLowerCase().trim()
  if (!q) return null

  const exactId = shapes.find((s) => s.id.toLowerCase() === q)
  if (exactId) return exactId

  const nameMatch = shapes.find((s) => {
    const name = String(s.props.name ?? '').toLowerCase()
    const text = String(s.props.text ?? '').toLowerCase()
    return name.includes(q) || text.includes(q)
  })
  if (nameMatch) return nameMatch

  const typeMatch = shapes.find((s) => {
    const type = s.type.toLowerCase()
    const name = String(s.props.name ?? '').toLowerCase()
    if (q === 'title' || q === 'heading' || q === 'text') return type === 'text' || name.includes('title') || name.includes('text')
    if (q === 'button' || q === 'card' || q === 'rect' || q === 'rectangle' || q === 'box') return type === 'rect' || name.includes('button') || name.includes('card')
    if (q === 'circle' || q === 'ellipse' || q === 'oval') return type === 'ellipse'
    if (q === 'frame' || q === 'screen') return type === 'frame'
    return false
  })
  if (typeMatch) return typeMatch

  return null
}

export function resolveSpatialShape(
  relation: ParsedSpatialRelation['relation'],
  anchor: CanvasShapeSummary,
  shapes: CanvasShapeSummary[],
  selfId?: string
): CanvasShapeSummary | null {
  const candidates = shapes.filter((s) => s.id !== anchor.id && s.id !== selfId)
  const aW = anchor.width ?? 180
  const aH = anchor.height ?? 96
  const aRight = anchor.x + aW
  const aBottom = anchor.y + aH

  if (relation === 'below') {
    const belowNodes = candidates.filter((s) => s.y >= anchor.y + aH / 2)
    belowNodes.sort((a, b) => Math.abs(a.y - aBottom) - Math.abs(b.y - aBottom))
    return belowNodes[0] ?? null
  }

  if (relation === 'above') {
    const aboveNodes = candidates.filter((s) => (s.y + (s.height ?? 96)) <= anchor.y + aH / 2)
    aboveNodes.sort((a, b) => Math.abs(anchor.y - (a.y + (a.height ?? 96))) - Math.abs(anchor.y - (b.y + (b.height ?? 96))))
    return aboveNodes[0] ?? null
  }

  if (relation === 'right_of' || relation === 'next_to') {
    const rightNodes = candidates.filter((s) => s.x >= anchor.x + aW / 2)
    rightNodes.sort((a, b) => Math.abs(a.x - aRight) - Math.abs(b.x - aRight))
    return rightNodes[0] ?? null
  }

  if (relation === 'left_of') {
    const leftNodes = candidates.filter((s) => (s.x + (s.width ?? 180)) <= anchor.x + aW / 2)
    leftNodes.sort((a, b) => Math.abs(anchor.x - (a.x + (a.width ?? 180))) - Math.abs(anchor.x - (b.x + (b.width ?? 180))))
    return leftNodes[0] ?? null
  }

  if (relation === 'inside') {
    const insideNodes = candidates.filter((s) => s.x >= anchor.x && s.y >= anchor.y && (s.x + (s.width ?? 0)) <= aRight && (s.y + (s.height ?? 0)) <= aBottom)
    return insideNodes[0] ?? null
  }

  return null
}

export function calculateRelativePlacement(
  relation: ParsedSpatialRelation['relation'],
  anchor: CanvasShapeSummary,
  target: CanvasShapeSummary,
  gap = 24
): { dx: number; dy: number } {
  const aW = anchor.width ?? 180
  const aH = anchor.height ?? 96
  const tW = target.width ?? 180
  const tH = target.height ?? 96

  let targetX = target.x
  let targetY = target.y

  if (relation === 'below') {
    targetY = anchor.y + aH + gap
    targetX = anchor.x + (aW - tW) / 2
  } else if (relation === 'above') {
    targetY = anchor.y - tH - gap
    targetX = anchor.x + (aW - tW) / 2
  } else if (relation === 'right_of' || relation === 'next_to') {
    targetX = anchor.x + aW + gap
    targetY = anchor.y + (aH - tH) / 2
  } else if (relation === 'left_of') {
    targetX = anchor.x - tW - gap
    targetY = anchor.y + (aH - tH) / 2
  }

  return {
    dx: Math.round(targetX - target.x),
    dy: Math.round(targetY - target.y),
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
  if ('targetId' in operation) return DEICTIC_TARGETS.has(operation.targetId) || Boolean(parseSpatialTarget(operation.targetId))
  if ('targetIds' in operation) return operation.targetIds.some((id) => DEICTIC_TARGETS.has(id) || Boolean(parseSpatialTarget(id)))
  return false
}

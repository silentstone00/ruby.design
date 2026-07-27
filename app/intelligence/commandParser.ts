import type { CanvasContext } from '../canvas/canvasContext'
import type { DesignOperation, ShapeKind } from '../operations/types'

export type ParsedCommand = {
  operations: DesignOperation[]
  confidence: number
}

export function parseDesignCommand(command: string, context: CanvasContext): ParsedCommand {
  const text = command.toLowerCase()

  if (/\bundo\b/.test(text)) return one({ type: 'undo' })
  if (/\bredo\b/.test(text)) return one({ type: 'redo' })

  const spatialMoveMatch = text.match(/\b(?:move|place|position)\s+(below|under|above|over|right of|left of|next to|inside)\s+(?:the\s+)?(.+)/)
  if (spatialMoveMatch) {
    const rel = spatialMoveMatch[1].replace('under', 'below').replace('over', 'above').replace(' ', '_')
    const anchor = spatialMoveMatch[2].trim()
    return one({
      type: 'move',
      targetId: `${rel}:${anchor}`,
      dx: 0,
      dy: 0,
    })
  }

  const radius = extractRadius(text)
  if (radius !== null) return one({ type: 'set_prop', targetId: 'this', path: 'props.cornerRadius', value: radius })

  const color = extractColor(text)
  if (color && !/\b(add|create|draw|insert)\b/.test(text)) {
    const targetMatch = text.match(/\b(?:make|set|change)\s+(?:the\s+)?([a-z0-9_-]+)\s+(?:to\s+)?/)?.[1]
    const targetId = targetMatch && targetMatch !== 'it' && targetMatch !== 'this' ? targetMatch : 'this'
    return one({ type: 'set_prop', targetId, path: 'props.color', value: color })
  }

  const createKind = getCreateKind(text)
  if (createKind) {
    return one({
      type: 'create_shape',
      shape: createKind,
      props: {
        x: 180 + context.visibleShapes.length * 18,
        y: 160 + context.visibleShapes.length * 14,
        text: extractQuotedText(command) ?? defaultTextFor(createKind),
        color: extractColor(text) ?? 'black',
        fill: createKind === 'rect' || createKind === 'ellipse' ? 'solid' : undefined,
        width: /\b(big|large|wide)\b/.test(text) ? 260 : 180,
        height: /\b(big|large|tall)\b/.test(text) ? 140 : 96,
      },
    })
  }

  if (/\b(left|right|up|down)\b/.test(text)) {
    const amount = /\b(bit|little|slightly)\b/.test(text) ? 24 : 72
    return one({
      type: 'move',
      targetId: 'this',
      dx: text.includes('left') ? -amount : text.includes('right') ? amount : 0,
      dy: text.includes('up') ? -amount : text.includes('down') ? amount : 0,
    })
  }

  if (/\b(bigger|larger|smaller|resize)\b/.test(text)) {
    const selected = context.visibleShapes.find((shape) => context.selectedIds.includes(shape.id))
    const width = selected?.width ?? 180
    const height = selected?.height ?? 96
    const factor = /\bsmaller\b/.test(text) ? 0.78 : 1.25
    return one({ type: 'resize', targetId: 'this', width: Math.round(width * factor), height: Math.round(height * factor) })
  }

  const quoted = extractQuotedText(command)
  if (quoted) return one({ type: 'set_text', targetId: 'this', text: quoted })

  return { operations: [], confidence: 0 }
}

function one(operation: DesignOperation): ParsedCommand {
  return { operations: [operation], confidence: 0.72 }
}

function getCreateKind(text: string): ShapeKind | null {
  if (/\b(circle|ellipse|oval)\b/.test(text)) return 'ellipse'
  if (/\b(arrow)\b/.test(text)) return 'arrow'
  if (/\b(line)\b/.test(text)) return 'line'
  if (/\b(text|title|label|headline)\b/.test(text)) return 'text'
  if (/\b(button|card|box|rectangle|square)\b/.test(text)) return 'rect'
  if (/\b(frame)\b/.test(text)) return 'frame'
  if (/\b(add|create|draw)\b/.test(text)) return 'rect'
  return null
}

function extractColor(text: string) {
  return ['black', 'blue', 'green', 'red', 'yellow', 'orange', 'violet', 'white', 'grey'].find((color) =>
    text.includes(color),
  )
}

function extractQuotedText(text: string) {
  return text.match(/["“](.+?)["”]/)?.[1] ?? null
}

function defaultTextFor(shape: ShapeKind) {
  if (shape === 'text') return 'Headline'
  if (shape === 'rect') return 'Button'
  return undefined
}

function extractRadius(text: string) {
  const match = text.match(/(?:corner\s*)?radius\s*(?:to)?\s*(\d+)/)
  return match ? Number(match[1]) : null
}

import type { DesignScene } from '../document/scene'
import { uniformRadius } from '../document/scene'
import type { DesignOperation, OperationResult } from './types'

export function applySceneOperations(scene: DesignScene, operations: DesignOperation[], command: string): {
  scene: DesignScene
  result: OperationResult
} {
  const result: OperationResult = {
    id: crypto.randomUUID(),
    ok: false,
    command,
    operations,
    message: 'No operation applied.',
    createdAt: Date.now(),
  }
  if (!operations.length) return { scene, result }

  let next = structuredClone(scene)
  try {
    for (const operation of operations) next = applyOne(next, operation)
    result.ok = true
    result.message = `Applied ${operations.length === 1 ? operations[0].type.replace(/_/g, ' ') : `${operations.length} changes`}.`
  } catch (error) {
    result.message = error instanceof Error ? error.message : 'Command failed.'
  }
  return { scene: next, result }
}

function applyOne(scene: DesignScene, operation: DesignOperation): DesignScene {
  if (operation.type === 'create_shape') {
    const id = crypto.randomUUID()
    const shape = operation.shape === 'frame' ? 'frame' : operation.shape
    return {
      nodes: [...scene.nodes, {
        id,
        type: shape,
        name: shape === 'text' ? 'Text' : shape === 'frame' ? 'Frame' : shape === 'ellipse' ? 'Ellipse' : shape === 'line' ? 'Line' : shape === 'arrow' ? 'Arrow' : 'Rectangle',
        x: operation.props.x ?? 180,
        y: operation.props.y ?? 180,
        width: operation.props.width ?? (shape === 'text' ? 260 : 180),
        height: operation.props.height ?? (shape === 'text' ? 48 : 96),
        fill: operation.props.fill ?? (shape === 'text' || shape === 'line' || shape === 'arrow' ? 'transparent' : '#2563eb'),
        color: operation.props.color ?? (shape === 'text' ? '#101828' : shape === 'line' || shape === 'arrow' ? '#101828' : '#ffffff'),
        stroke: shape === 'line' || shape === 'arrow' ? operation.props.color ?? '#101828' : undefined,
        strokeWidth: shape === 'line' || shape === 'arrow' ? 2 : undefined,
        text: operation.props.text,
        fontSize: shape === 'text' ? 24 : undefined,
        radius: shape === 'rect' || shape === 'frame' ? uniformRadius(operation.props.cornerRadius ?? 12) : undefined,
      }],
    }
  }

  const node = scene.nodes.find((item) => item.id === ('targetId' in operation ? operation.targetId : ''))
  if (!node) throw new Error('Select an object before changing it.')
  const updated = { ...node }
  if (operation.type === 'set_text') updated.text = operation.text
  if (operation.type === 'move') { updated.x += operation.dx; updated.y += operation.dy }
  if (operation.type === 'resize') { updated.width = operation.width ?? updated.width; updated.height = operation.height ?? updated.height }
  if (operation.type === 'set_prop') {
    if (operation.path === 'props.color') updated.color = String(operation.value)
    if (operation.path === 'props.fill') updated.fill = String(operation.value)
    if (operation.path === 'props.cornerRadius') updated.radius = uniformRadius(Number(operation.value))
  }
  return { nodes: scene.nodes.map((item) => item.id === node.id ? updated : item) }
}

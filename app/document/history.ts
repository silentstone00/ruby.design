import type { DesignNode, DesignScene } from './scene'

export type AtomicOperation =
  | { type: 'add_node'; node: DesignNode; index?: number }
  | { type: 'remove_node'; node: DesignNode }
  | { type: 'update_node'; id: string; patch: Partial<DesignNode>; previous: Partial<DesignNode> }
  | { type: 'reorder_nodes'; nodes: DesignNode[]; previousNodes: DesignNode[] }

export type OperationTransaction = {
  id: string
  description: string
  forward: AtomicOperation[]
  inverse: AtomicOperation[]
  createdAt: number
}

export function createTransaction(
  description: string,
  forward: AtomicOperation[],
  inverse: AtomicOperation[]
): OperationTransaction {
  return {
    id: crypto.randomUUID(),
    description,
    forward,
    inverse,
    createdAt: Date.now(),
  }
}

export function applyAtomicOperation(scene: DesignScene, op: AtomicOperation): DesignScene {
  if (op.type === 'add_node') {
    if (scene.nodes.some((item) => item.id === op.node.id)) {
      return { nodes: scene.nodes.map((item) => (item.id === op.node.id ? structuredClone(op.node) : item)) }
    }
    const nodes = [...scene.nodes]
    const index = op.index === undefined ? nodes.length : Math.min(Math.max(op.index, 0), nodes.length)
    nodes.splice(index, 0, structuredClone(op.node))
    return { nodes }
  }

  if (op.type === 'remove_node') {
    return { nodes: scene.nodes.filter((item) => item.id !== op.node.id) }
  }

  if (op.type === 'update_node') {
    return {
      nodes: scene.nodes.map((item) => (item.id === op.id ? { ...item, ...op.patch } : item)),
    }
  }

  if (op.type === 'reorder_nodes') {
    return { nodes: structuredClone(op.nodes) }
  }

  return scene
}

export function applyTransaction(scene: DesignScene, transaction: OperationTransaction): DesignScene {
  let next = scene
  for (const op of transaction.forward) {
    next = applyAtomicOperation(next, op)
  }
  return next
}

export function undoTransaction(scene: DesignScene, transaction: OperationTransaction): DesignScene {
  let next = scene
  for (let i = transaction.inverse.length - 1; i >= 0; i--) {
    next = applyAtomicOperation(next, transaction.inverse[i])
  }
  return next
}

/** Helper to generate atomic diff operations between two node state snapshots */
export function diffNodeSnapshots(
  initialNodes: DesignNode[],
  finalNodes: DesignNode[],
  description = 'Update nodes'
): OperationTransaction | null {
  const initialMap = new Map(initialNodes.map((node) => [node.id, node]))
  const finalMap = new Map(finalNodes.map((node) => [node.id, node]))

  const forward: AtomicOperation[] = []
  const inverse: AtomicOperation[] = []

  // Check removed nodes. Each removal's inverse must restore the node at its original
  // array index (index == paint order), not append it -- otherwise undoing a delete
  // resurrects the node in front of everything instead of back where it was.
  // undoTransaction() applies `inverse` last-to-first, so pushing these in descending
  // original-index order here means they get *applied* in ascending order, which is
  // required for the splice-based reinsertion to land correctly when several nodes are
  // removed in the same transaction (e.g. deleting a frame and its children together).
  const removed: Array<{ node: DesignNode; index: number }> = []
  initialNodes.forEach((initial, index) => {
    if (!finalMap.has(initial.id)) removed.push({ node: initial, index })
  })
  for (const { node } of removed) forward.push({ type: 'remove_node', node: structuredClone(node) })
  for (const { node, index } of [...removed].reverse()) inverse.push({ type: 'add_node', node: structuredClone(node), index })

  // Check added or updated nodes
  for (const final of finalNodes) {
    const initial = initialMap.get(final.id)
    if (!initial) {
      forward.push({ type: 'add_node', node: structuredClone(final) })
      inverse.push({ type: 'remove_node', node: structuredClone(final) })
    } else {
      // Find property diffs
      const patch: Partial<DesignNode> = {}
      const previous: Partial<DesignNode> = {}
      let hasChanges = false

      const allKeys = new Set([...Object.keys(initial), ...Object.keys(final)]) as Set<keyof DesignNode>
      for (const key of allKeys) {
        const valInit = initial[key]
        const valFin = final[key]
        if (JSON.stringify(valInit) !== JSON.stringify(valFin)) {
          hasChanges = true
          ;(patch as Record<string, unknown>)[key] = structuredClone(valFin)
          ;(previous as Record<string, unknown>)[key] = structuredClone(valInit)
        }
      }

      if (hasChanges) {
        forward.push({ type: 'update_node', id: final.id, patch, previous })
        inverse.push({ type: 'update_node', id: final.id, patch: previous, previous: patch })
      }
    }
  }

  // Check reordering
  const initialOrder = initialNodes.map((n) => n.id).join(',')
  const finalOrder = finalNodes.map((n) => n.id).join(',')
  if (initialOrder !== finalOrder && forward.length === 0) {
    forward.push({ type: 'reorder_nodes', nodes: structuredClone(finalNodes), previousNodes: structuredClone(initialNodes) })
    inverse.push({ type: 'reorder_nodes', nodes: structuredClone(initialNodes), previousNodes: structuredClone(finalNodes) })
  }

  if (forward.length === 0) return null

  return createTransaction(description, forward, inverse)
}

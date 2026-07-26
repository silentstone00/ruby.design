import type { OperationTransaction } from '../document/history'

export type ShapeKind = 'frame' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'text'

export type ShapeProps = {
  x?: number
  y?: number
  width?: number
  height?: number
  text?: string
  color?: string
  fill?: string
  opacity?: number
  cornerRadius?: number
}

export type DesignOperation =
  | { type: 'create_shape'; shape: ShapeKind; props: ShapeProps }
  | { type: 'set_text'; targetId: string; text: string }
  | { type: 'set_prop'; targetId: string; path: string; value: unknown }
  | { type: 'move'; targetId: string; dx: number; dy: number }
  | { type: 'resize'; targetId: string; width?: number; height?: number }
  | { type: 'align'; targetIds: string[]; mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' }
  | { type: 'reorder'; targetId: string; mode: 'front' | 'back' | 'forward' | 'backward' }
  | { type: 'group'; targetIds: string[] }
  | { type: 'undo' }
  | { type: 'redo' }

export type OperationResult = {
  id: string
  ok: boolean
  command: string
  operations: DesignOperation[]
  transaction?: OperationTransaction
  message: string
  createdAt: number
}


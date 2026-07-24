import type { DesignOperation } from '../operations/types'
import type { DesignScene } from './scene'

export const DOCUMENT_SCHEMA_VERSION = 2

export type RubyDesignDocument = {
  schemaVersion: typeof DOCUMENT_SCHEMA_VERSION
  scene: DesignScene
  operationLog: DocumentOperationLogEntry[]
}

export type DocumentOperationLogEntry = {
  id: string
  command: string
  operations: DesignOperation[]
  createdAt: number
}

export function createEmptyDocument(scene: DesignScene): RubyDesignDocument {
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    scene,
    operationLog: [],
  }
}

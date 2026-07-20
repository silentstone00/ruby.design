import type { DesignOperation } from '../operations/types'

export const DOCUMENT_SCHEMA_VERSION = 1

export type RubyDesignDocument = {
  schemaVersion: typeof DOCUMENT_SCHEMA_VERSION
  tldrawSnapshot: unknown
  operationLog: DocumentOperationLogEntry[]
}

export type DocumentOperationLogEntry = {
  id: string
  command: string
  operations: DesignOperation[]
  createdAt: number
}

export function createEmptyDocument(snapshot: unknown): RubyDesignDocument {
  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    tldrawSnapshot: snapshot,
    operationLog: [],
  }
}

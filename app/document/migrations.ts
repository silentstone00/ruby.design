import { DOCUMENT_SCHEMA_VERSION, type RubyDesignDocument } from './schema'

export function migrateDocument(input: unknown): RubyDesignDocument {
  if (!isRecord(input)) {
    throw new Error('Document is not a valid JSON object.')
  }

  const schemaVersion = Number(input.schemaVersion ?? 0)
  if (schemaVersion > DOCUMENT_SCHEMA_VERSION) {
    throw new Error(`Document schema ${schemaVersion} is newer than this app supports.`)
  }

  if (schemaVersion === 1) {
    return input as RubyDesignDocument
  }

  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    tldrawSnapshot: input.tldrawSnapshot ?? input,
    operationLog: [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

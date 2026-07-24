import { DOCUMENT_SCHEMA_VERSION, type RubyDesignDocument } from './schema'
import { createStarterScene, isDesignScene } from './scene'

export function migrateDocument(input: unknown): RubyDesignDocument {
  if (!isRecord(input)) {
    throw new Error('Document is not a valid JSON object.')
  }

  const schemaVersion = Number(input.schemaVersion ?? 0)
  if (schemaVersion > DOCUMENT_SCHEMA_VERSION) {
    throw new Error(`Document schema ${schemaVersion} is newer than this app supports.`)
  }

  if (schemaVersion === 2 && isDesignScene(input.scene)) {
    return input as RubyDesignDocument
  }

  return {
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    scene: createStarterScene(),
    operationLog: [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

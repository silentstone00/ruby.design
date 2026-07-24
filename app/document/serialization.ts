import { createEmptyDocument, type RubyDesignDocument } from './schema'
import { migrateDocument } from './migrations'
import type { DesignScene } from './scene'

export function serializeDocument(scene: DesignScene): RubyDesignDocument {
  return createEmptyDocument(scene)
}

export function restoreDocument(payload: unknown): RubyDesignDocument {
  return migrateDocument(payload)
}

export function stringifyDocument(document: RubyDesignDocument): string {
  return JSON.stringify(document, null, 2)
}

export function parseDocument(json: string): RubyDesignDocument {
  return migrateDocument(JSON.parse(json))
}

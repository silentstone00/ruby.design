import { getSnapshot, loadSnapshot as loadTldrawSnapshot, type Editor } from 'tldraw'
import { createEmptyDocument, type RubyDesignDocument } from './schema'
import { migrateDocument } from './migrations'

export function serializeDocument(editor: Editor): RubyDesignDocument {
  return createEmptyDocument(getSnapshot(editor.store))
}

export function restoreDocument(editor: Editor, payload: unknown) {
  const document = migrateDocument(payload)
  loadTldrawSnapshot(editor.store, document.tldrawSnapshot as Parameters<typeof loadTldrawSnapshot>[1])
}

export function stringifyDocument(document: RubyDesignDocument): string {
  return JSON.stringify(document, null, 2)
}

export function parseDocument(json: string): RubyDesignDocument {
  return migrateDocument(JSON.parse(json))
}

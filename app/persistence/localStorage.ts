import { parseDocument, restoreDocument, serializeDocument, stringifyDocument } from '../document/serialization'
import type { DesignScene } from '../document/scene'

const STORAGE_KEY = 'ruby.design.document.v1'

export function saveSnapshot(scene: DesignScene) {
  window.localStorage.setItem(STORAGE_KEY, stringifyDocument(serializeDocument(scene)))
}

export function loadSnapshot(): DesignScene | null {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  return restoreDocument(parseDocument(raw)).scene
}

export function clearSavedSnapshot() {
  window.localStorage.removeItem(STORAGE_KEY)
}

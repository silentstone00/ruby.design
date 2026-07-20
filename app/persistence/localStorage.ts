import type { Editor } from 'tldraw'
import { parseDocument, restoreDocument, serializeDocument, stringifyDocument } from '../document/serialization'

const STORAGE_KEY = 'ruby.design.document.v1'

export function saveSnapshot(editor: Editor) {
  window.localStorage.setItem(STORAGE_KEY, stringifyDocument(serializeDocument(editor)))
}

export function loadSnapshot(editor: Editor) {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  restoreDocument(editor, parseDocument(raw))
}

export function clearSavedSnapshot() {
  window.localStorage.removeItem(STORAGE_KEY)
}

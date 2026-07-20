import { useSyncExternalStore } from 'react'

export type TranscriptState = {
  interim: string
  finals: string[]
  addFinal: (text: string) => void
  setInterim: (text: string) => void
  clear: () => void
}

let state = {
  interim: '',
  finals: [] as string[],
}

const listeners = new Set<() => void>()

export function useTranscriptState(): TranscriptState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot)
  return {
    ...snapshot,
    addFinal,
    setInterim,
    clear,
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

function addFinal(text: string) {
  state = { interim: '', finals: [text, ...state.finals].slice(0, 50) }
  emit()
}

function setInterim(text: string) {
  state = { ...state, interim: text }
  emit()
}

function clear() {
  state = { interim: '', finals: [] }
  emit()
}

function emit() {
  listeners.forEach((listener) => listener())
}

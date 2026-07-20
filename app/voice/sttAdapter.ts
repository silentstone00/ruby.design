export type SttEvent =
  | { type: 'interim'; text: string }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string }

export type SttAdapter = {
  start(onEvent: (event: SttEvent) => void): Promise<void>
  stop(): Promise<void>
}

export class BrowserSpeechAdapter implements SttAdapter {
  private recognition: SpeechRecognition | null = null

  async start(onEvent: (event: SttEvent) => void) {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      onEvent({ type: 'error', message: 'Browser speech recognition is not available.' })
      return
    }

    this.recognition = new Recognition()
    this.recognition.interimResults = true
    this.recognition.continuous = false
    this.recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1]
      const text = latest[0]?.transcript.trim() ?? ''
      onEvent({ type: latest.isFinal ? 'final' : 'interim', text })
    }
    this.recognition.onerror = (event) => onEvent({ type: 'error', message: event.error })
    this.recognition.start()
  }

  async stop() {
    this.recognition?.stop()
    this.recognition = null
  }
}

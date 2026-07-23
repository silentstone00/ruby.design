export type SttEvent =
  | { type: 'interim'; text: string }
  | { type: 'final'; text: string }
  | { type: 'end' }
  | { type: 'error'; message: string }

export type SttAdapter = {
  start(onEvent: (event: SttEvent) => void): Promise<void>
  stop(): Promise<void>
}

export class BrowserSpeechAdapter implements SttAdapter {
  private recognition: SpeechRecognition | null = null
  private micStream: MediaStream | null = null

  async start(onEvent: (event: SttEvent) => void) {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      onEvent({
        type: 'error',
        message: 'Speech recognition is not available in this browser. Use typed commands or configure OpenAI/Deepgram STT.',
      })
      return
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.micStream.getTracks().forEach((track) => track.stop())
      this.micStream = null
    } catch (error) {
      onEvent({ type: 'error', message: toMicErrorMessage(error) })
      return
    }

    this.recognition = new Recognition()
    this.recognition.lang = 'en-US'
    this.recognition.interimResults = true
    this.recognition.continuous = false
    this.recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1]
      const text = latest[0]?.transcript.trim() ?? ''
      onEvent({ type: latest.isFinal ? 'final' : 'interim', text })
    }
    this.recognition.onerror = (event) => onEvent({ type: 'error', message: toSpeechErrorMessage(event.error) })
    this.recognition.onend = () => {
      this.recognition = null
      onEvent({ type: 'end' })
    }

    try {
      this.recognition.start()
    } catch (error) {
      onEvent({ type: 'error', message: error instanceof Error ? error.message : 'Could not start speech recognition.' })
    }
  }

  async stop() {
    this.recognition?.stop()
    this.recognition = null
    this.micStream?.getTracks().forEach((track) => track.stop())
    this.micStream = null
  }
}

function toMicErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Microphone permission was blocked. Allow microphone access for this site and try again.'
  }

  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'No microphone was found on this device.'
  }

  return 'Could not access the microphone.'
}

function toSpeechErrorMessage(error: string) {
  if (error === 'network') {
    return 'The browser speech service returned a network error. This prototype uses the browser Web Speech API, which depends on a remote browser service; use typed commands for now or wire in OpenAI/Deepgram STT.'
  }

  if (error === 'not-allowed' || error === 'service-not-allowed') {
    return 'Speech recognition was blocked by the browser. Check microphone and speech permissions.'
  }

  if (error === 'no-speech') {
    return 'I did not hear speech. Try again closer to the mic.'
  }

  if (error === 'audio-capture') {
    return 'The browser could not capture microphone audio.'
  }

  return `Speech recognition failed: ${error}.`
}

import type { SttAdapter, SttEvent } from './sttAdapter'

export class WhisperSttAdapter implements SttAdapter {
  private mediaRecorder: MediaRecorder | null = null
  private micStream: MediaStream | null = null
  private audioChunks: Blob[] = []
  private onEventCallback: ((event: SttEvent) => void) | null = null
  private isProcessing = false

  async start(onEvent: (event: SttEvent) => void): Promise<void> {
    this.onEventCallback = onEvent
    this.audioChunks = []
    this.isProcessing = false

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      onEvent({ type: 'error', message: 'Microphone access was denied or not found.' })
      return
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : ''

    try {
      this.mediaRecorder = new MediaRecorder(this.micStream, mimeType ? { mimeType } : undefined)
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        this.processAudio()
      }

      this.mediaRecorder.start(100)
      onEvent({ type: 'interim', text: 'Listening (speak command, then click mic to finish)...' })
    } catch (err) {
      onEvent({ type: 'error', message: err instanceof Error ? err.message : 'Could not start recording audio.' })
    }
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
      this.mediaRecorder = null
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop())
      this.micStream = null
    }
  }

  private async processAudio() {
    if (this.isProcessing || !this.audioChunks.length || !this.onEventCallback) return
    this.isProcessing = true

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !anonKey) {
      this.onEventCallback({ type: 'error', message: 'Supabase credentials missing.' })
      return
    }

    this.onEventCallback({ type: 'interim', text: 'Transcribing speech...' })

    try {
      const audioBlob = new Blob(this.audioChunks, { type: this.audioChunks[0]?.type || 'audio/webm' })
      const formData = new FormData()
      formData.append('file', audioBlob, 'command.webm')

      const res = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: formData,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Whisper transcription failed: ${errText}`)
      }

      const data = await res.json()
      const text = data.text?.trim() ?? ''

      if (text) {
        this.onEventCallback({ type: 'final', text })
      } else {
        this.onEventCallback({ type: 'error', message: 'No speech recognized. Try speaking louder or closer to the mic.' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Audio transcription error'
      this.onEventCallback({ type: 'error', message })
    } finally {
      this.onEventCallback({ type: 'end' })
    }
  }
}

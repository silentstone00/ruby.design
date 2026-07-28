import type { SttAdapter, SttEvent } from './sttAdapter'

export class DeepgramSttAdapter implements SttAdapter {
  private socket: WebSocket | null = null
  private mediaRecorder: MediaRecorder | null = null
  private micStream: MediaStream | null = null

  async start(onEvent: (event: SttEvent) => void): Promise<void> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !anonKey) {
      onEvent({ type: 'error', message: 'Supabase credentials missing.' })
      return
    }

    let token = ''
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/deepgram-token`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error ?? `Token request failed with status ${res.status}`)
      }

      const data = await res.json()
      token = data.token
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not fetch Deepgram token'
      onEvent({ type: 'error', message: `Deepgram STT unavailable: ${message}` })
      return
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      onEvent({ type: 'error', message: 'Microphone access was denied or not found.' })
      return
    }

    const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&endpointing=300&interim_results=true&keywords=radius:2&keywords=opacity:2&keywords=shadow:2&keywords=frame:2&keywords=iPhone:2&keywords=fill:2&keywords=stroke:2`

    try {
      this.socket = new WebSocket(wsUrl, ['token', token])

      this.socket.onopen = () => {
        if (!this.micStream) return

        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''

        this.mediaRecorder = new MediaRecorder(this.micStream, mimeType ? { mimeType } : undefined)
        this.mediaRecorder.addEventListener('dataavailable', async (event) => {
          if (event.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(event.data)
          }
        })
        this.mediaRecorder.start(250)
      }

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const transcript = data.channel?.alternatives?.[0]?.transcript?.trim() ?? ''
          if (!transcript) return

          if (data.is_final) {
            onEvent({ type: 'final', text: transcript })
          } else {
            onEvent({ type: 'interim', text: transcript })
          }
        } catch {
          // ignore non-json messages
        }
      }

      this.socket.onerror = () => {
        onEvent({ type: 'error', message: 'Deepgram streaming WebSocket connection error.' })
      }

      this.socket.onclose = () => {
        this.stop()
        onEvent({ type: 'end' })
      }
    } catch (err) {
      onEvent({ type: 'error', message: err instanceof Error ? err.message : 'Could not open Deepgram streaming socket.' })
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

    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'CloseStream' }))
        this.socket.close()
      }
      this.socket = null
    }
  }
}

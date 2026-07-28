import type { SttAdapter, SttEvent } from './sttAdapter'
import { BrowserSpeechAdapter } from './sttAdapter'
import { DeepgramSttAdapter } from './deepgramAdapter'
import { WhisperSttAdapter } from './whisperAdapter'

export class HybridSttAdapter implements SttAdapter {
  private deepgramAdapter: SttAdapter = new DeepgramSttAdapter()
  private whisperAdapter: SttAdapter = new WhisperSttAdapter()
  private browserAdapter: SttAdapter = new BrowserSpeechAdapter()
  private activeAdapter: SttAdapter | null = null

  async start(onEvent: (event: SttEvent) => void): Promise<void> {
    // Try Deepgram streaming STT first
    this.activeAdapter = this.deepgramAdapter

    await this.deepgramAdapter.start(async (event) => {
      if (event.type === 'error' && (event.message.includes('Deepgram STT unavailable') || event.message.includes('WebSocket'))) {
        // Fall back to OpenAI Whisper (uses existing OPENAI_API_KEY)
        this.activeAdapter = this.whisperAdapter
        await this.whisperAdapter.start((whisperEvent) => {
          if (whisperEvent.type === 'error') {
            // Final fallback to browser Web Speech API
            this.activeAdapter = this.browserAdapter
            this.browserAdapter.start(onEvent)
            return
          }
          onEvent(whisperEvent)
        })
        return
      }
      onEvent(event)
    })
  }

  async stop(): Promise<void> {
    await this.activeAdapter?.stop()
    this.activeAdapter = null
  }
}

export function createSttAdapter(): SttAdapter {
  return new HybridSttAdapter()
}

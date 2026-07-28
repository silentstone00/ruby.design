import type { SttAdapter, SttEvent } from './sttAdapter'
import { BrowserSpeechAdapter } from './sttAdapter'
import { DeepgramSttAdapter } from './deepgramAdapter'

export class HybridSttAdapter implements SttAdapter {
  private primaryAdapter: SttAdapter = new DeepgramSttAdapter()
  private fallbackAdapter: SttAdapter = new BrowserSpeechAdapter()
  private activeAdapter: SttAdapter | null = null

  async start(onEvent: (event: SttEvent) => void): Promise<void> {
    this.activeAdapter = this.primaryAdapter

    await this.primaryAdapter.start((event) => {
      if (event.type === 'error' && event.message.includes('Deepgram STT unavailable')) {
        // Fall back seamlessly to browser Web Speech API
        this.activeAdapter = this.fallbackAdapter
        this.fallbackAdapter.start(onEvent)
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

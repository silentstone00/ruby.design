import type { CanvasContext } from '../canvas/canvasContext'
import type { DesignOperation } from '../operations/types'

export type CommandInterpreter = {
  interpret(command: string, context: CanvasContext): Promise<DesignOperation[]>
}

export class NotConfiguredLlmClient implements CommandInterpreter {
  async interpret(): Promise<DesignOperation[]> {
    throw new Error('No LLM client configured.')
  }
}

export class SupabaseLlmClient implements CommandInterpreter {
  private url: string
  private key: string

  constructor() {
    this.url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
    this.key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? ''
  }

  isConfigured(): boolean {
    return Boolean(this.url && this.key)
  }

  async interpret(command: string, context: CanvasContext): Promise<DesignOperation[]> {
    if (!this.isConfigured()) {
      throw new Error('Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY) are missing.')
    }

    const endpoint = `${this.url.replace(/\/$/, '')}/functions/v1/parse-command`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
      },
      body: JSON.stringify({ command, context }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`LLM Edge Function returned status ${response.status}: ${errorText}`)
    }

    const data = (await response.json()) as { operations?: DesignOperation[]; error?: string }
    if (!data.operations || !Array.isArray(data.operations)) {
      throw new Error(data.error || 'Invalid response from LLM Edge Function.')
    }

    return data.operations
  }
}

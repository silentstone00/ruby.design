import type { CanvasContext } from '../canvas/canvasContext'
import type { DesignOperation } from '../operations/types'
import { designOperationToolSchema } from './toolSchema'

export type CommandInterpreter = {
  interpret(command: string, context: CanvasContext): Promise<DesignOperation[]>
}

export class NotConfiguredLlmClient implements CommandInterpreter {
  async interpret(): Promise<DesignOperation[]> {
    throw new Error(`No LLM client configured for ${designOperationToolSchema.name}.`)
  }
}

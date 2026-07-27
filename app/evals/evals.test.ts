import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseDesignCommand } from '../intelligence/commandParser'
import { resolveReferences } from '../referenceResolver/referenceResolver'
import { SupabaseLlmClient } from '../intelligence/llmClient'
import type { CanvasContext } from '../canvas/canvasContext'
import type { DesignOperation } from '../operations/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

type CommandFixture = {
  command: string
  context: Partial<CanvasContext>
  expected: Partial<DesignOperation>[]
}

function loadFixtures(): CommandFixture[] {
  const filePath = resolve(__dirname, 'command-fixtures.jsonl')
  const content = readFileSync(filePath, 'utf-8')
  return content
    .split('\n')
    .filter((line: string) => line.trim().length > 0)
    .map((line: string) => JSON.parse(line) as CommandFixture)
}

function buildMockContext(fixture: CommandFixture): CanvasContext {
  return {
    selectedIds: fixture.context.selectedIds ?? [],
    hoverId: fixture.context.hoverId ?? null,
    recentOperations: [],
    visibleShapes: [
      { id: 'shape:box', type: 'rect', x: 100, y: 100, width: 200, height: 100, props: { name: 'Box' } },
      { id: 'welcome-title', type: 'text', x: 50, y: 50, width: 300, height: 40, props: { name: 'Title' } },
    ],
  }
}

describe('Command Parsing Evals', () => {
  const fixtures = loadFixtures()

  describe('Deterministic Regex Parser', () => {
    it.each(fixtures)('parses "$command" correctly', (fixture: CommandFixture) => {
      const fullContext = buildMockContext(fixture)

      const parsed = parseDesignCommand(fixture.command, fullContext)
      const resolved = resolveReferences(parsed.operations, fullContext)

      expect(resolved.operations.length).toBeGreaterThan(0)
      const firstOp = resolved.operations[0]
      const expectedFirst = fixture.expected[0]

      expect(firstOp.type).toBe(expectedFirst.type)
      if ('targetId' in expectedFirst && 'targetId' in firstOp) {
        expect(firstOp.targetId).toBe(expectedFirst.targetId)
      }
    })
  })

  describe('LLM Backend Edge Function (Opt-in)', () => {
    const client = new SupabaseLlmClient()
    const shouldRun = process.env.RUN_LLM_EVALS === 'true' && client.isConfigured()

    it.runIf(shouldRun).each(fixtures)('evaluates LLM tool calling for "$command"', async (fixture) => {
      const fullContext = buildMockContext(fixture)
      const ops = await client.interpret(fixture.command, fullContext)
      expect(ops.length).toBeGreaterThan(0)
      expect(ops[0].type).toBe(fixture.expected[0].type)
    }, 10000)
  })
})

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://esm.sh/zod@3.22.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const createShapeOp = z.object({
  type: z.literal('create_shape'),
  shape: z.enum(['frame', 'rect', 'ellipse', 'line', 'arrow', 'text']),
  props: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    text: z.string().optional(),
    color: z.string().optional(),
    fill: z.string().optional(),
    opacity: z.number().optional(),
    cornerRadius: z.number().optional(),
  }),
})

const setTextOp = z.object({
  type: z.literal('set_text'),
  targetId: z.string(),
  text: z.string(),
})

const setPropOp = z.object({
  type: z.literal('set_prop'),
  targetId: z.string(),
  path: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

const moveOp = z.object({
  type: z.literal('move'),
  targetId: z.string(),
  dx: z.number(),
  dy: z.number(),
})

const resizeOp = z.object({
  type: z.literal('resize'),
  targetId: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
})

const alignOp = z.object({
  type: z.literal('align'),
  targetIds: z.array(z.string()),
  mode: z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom']),
})

const reorderOp = z.object({
  type: z.literal('reorder'),
  targetId: z.string(),
  mode: z.enum(['front', 'back', 'forward', 'backward']),
})

const groupOp = z.object({
  type: z.literal('group'),
  targetIds: z.array(z.string()),
})

const undoOp = z.object({
  type: z.literal('undo'),
})

const redoOp = z.object({
  type: z.literal('redo'),
})

const designOperationSchema = z.discriminatedUnion('type', [
  createShapeOp,
  setTextOp,
  setPropOp,
  moveOp,
  resizeOp,
  alignOp,
  reorderOp,
  groupOp,
  undoOp,
  redoOp,
])

const requestPayloadSchema = z.object({
  command: z.string(),
  context: z.object({
    selectedIds: z.array(z.string()).optional(),
    hoveredId: z.string().nullable().optional(),
    visibleShapes: z.array(z.object({ id: z.string(), type: z.string(), name: z.string() })).optional(),
  }).passthrough(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY is not configured in Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const parsedReq = requestPayloadSchema.safeParse(body)
    if (!parsedReq.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request payload format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { command, context } = parsedReq.data

    const systemPrompt = `You are the AI command interpreter for Ruby Design, a voice-first vector canvas tool.
Your job is to translate the user's natural language command into a list of DesignOperation actions.

AVAILABLE CANVAS OBJECTS:
${JSON.stringify(context.visibleShapes ?? [], null, 2)}

CURRENT SELECTION: ${JSON.stringify(context.selectedIds ?? [])}

RULES:
1. Always output valid operations using the apply_design_operations function tool.
2. For targetId in operations, reference objects using:
   - Specific object ID from AVAILABLE CANVAS OBJECTS if identified by name or role.
   - Deictic references: "selected", "this", "that", "it" if referring to the active selection.
3. For create_shape:
   - x, y coordinates default around 180 if unspecified.
   - Default fill/stroke colors: buttons #2563eb, text #101828, frames #ffffff with stroke #cbd5e1.
4. Always produce a non-empty operations array if command asks for canvas modifications.`

    const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: command },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'apply_design_operations',
              description: 'Applies validated UI design canvas operations.',
              parameters: {
                type: 'object',
                properties: {
                  operations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string' },
                        shape: { type: 'string' },
                        targetId: { type: 'string' },
                        targetIds: { type: 'array', items: { type: 'string' } },
                        text: { type: 'string' },
                        path: { type: 'string' },
                        value: { type: 'string' },
                        dx: { type: 'number' },
                        dy: { type: 'number' },
                        width: { type: 'number' },
                        height: { type: 'number' },
                        mode: { type: 'string' },
                        props: { type: 'object' },
                      },
                      required: ['type'],
                    },
                  },
                },
                required: ['operations'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'apply_design_operations' } },
        temperature: 0.1,
      }),
    })

    if (!openAiRes.ok) {
      const errText = await openAiRes.text()
      return new Response(
        JSON.stringify({ error: `OpenAI API call failed: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiData = await openAiRes.json()
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0]
    if (!toolCall || toolCall.function.name !== 'apply_design_operations') {
      return new Response(
        JSON.stringify({ error: 'Model did not return tool call operations.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const args = JSON.parse(toolCall.function.arguments)
    const opsArray = Array.isArray(args.operations) ? args.operations : []
    const validatedOps = []

    for (const rawOp of opsArray) {
      const parsedOp = designOperationSchema.safeParse(rawOp)
      if (parsedOp.success) {
        validatedOps.push(parsedOp.data)
      }
    }

    return new Response(
      JSON.stringify({ operations: validatedOps }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal edge function error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

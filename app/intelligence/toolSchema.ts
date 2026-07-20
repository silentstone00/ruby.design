export const designOperationToolSchema = {
  name: 'apply_design_operations',
  description: 'Apply deterministic operations to the current design canvas.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['operations'],
    properties: {
      operations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
          required: ['type'],
          properties: {
            type: {
              type: 'string',
              enum: [
                'create_shape',
                'set_text',
                'set_prop',
                'move',
                'resize',
                'align',
                'reorder',
                'group',
                'undo',
                'redo',
              ],
            },
          },
        },
      },
    },
  },
} as const

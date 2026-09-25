import type { SelectItem } from '@workflowbuilder/ui';

// Strict structured outputs want every field required and no extra keys.
export const refundReviewOutputSchema = {
  type: 'object',
  properties: {
    refundAmount: { type: 'number', title: 'Refund amount', description: 'In USD, under the refund policy.' },
    orderDate: { type: 'string', title: 'Order date', description: 'YYYY-MM-DD, as given in the message.' },
    replyDraft: {
      type: 'string',
      title: 'Reply draft',
      description: 'The body of the reply to the customer, no subject line: under 120 words, signed "Lumen Support".',
    },
    internalReasoning: {
      type: 'string',
      title: 'Internal reasoning',
      description: 'Why this amount, for the team. Never sent to the customer.',
    },
  },
  required: ['refundAmount', 'orderDate', 'replyDraft', 'internalReasoning'],
  additionalProperties: false,
};

type OutputSchema = typeof refundReviewOutputSchema;

type ResponseOption = 'text' | 'refund-review' | 'custom';

export const responseOptions: SelectItem[] = [
  { value: 'text', label: 'Plain text' },
  { value: 'refund-review', label: 'Structured: refund review' },
];

// Never chosen, only shown: a schema no preset matches must not read as Plain text.
export const customResponseOption: SelectItem = { value: 'custom', label: 'Structured: custom schema', disabled: true };

// String equality, not identity: a preset that went through a JSON round trip (reload, import) still matches.
const isSameSchema = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Read off the data on purpose: a stored mode could disagree with the schema that is actually on the node.
export function responseOptionOf(outputSchema: unknown): ResponseOption {
  if (outputSchema == null) return 'text';
  return isSameSchema(outputSchema, refundReviewOutputSchema) ? 'refund-review' : 'custom';
}

export function outputSchemaFor(option: unknown): OutputSchema | undefined {
  return option === 'refund-review' ? refundReviewOutputSchema : undefined;
}

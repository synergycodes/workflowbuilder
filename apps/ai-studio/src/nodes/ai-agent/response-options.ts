import type { SelectItem } from '@workflowbuilder/ui';

// What the AI fills in for Refund Review. Strict structured outputs want every field required and no extra keys.
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

export type ResponseOption = 'text' | 'refund-review';

export const responseOptions: SelectItem[] = [
  { value: 'text', label: 'Plain text' },
  { value: 'refund-review', label: 'Structured: refund review' },
];

// String equality, not identity: a preset that went through a JSON round trip (import, paste) still matches.
const isSameSchema = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Read off the data on purpose: a stored mode could disagree with the schema that is actually on the node.
export function responseOptionOf(outputSchema: unknown): ResponseOption {
  return isSameSchema(outputSchema, refundReviewOutputSchema) ? 'refund-review' : 'text';
}

export function outputSchemaFor(option: unknown): typeof refundReviewOutputSchema | undefined {
  return option === 'refund-review' ? refundReviewOutputSchema : undefined;
}

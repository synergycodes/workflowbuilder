import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

// Every type the form shows (number, string, boolean) and two it leaves out (integer, array).
export const reviewRequest = {
  version: 1,
  actions: [
    { name: 'approve', label: 'Approve', effect: 'resume', port: 'source:inner:approved' },
    { name: 'reject', label: 'Reject', effect: 'reject', port: 'source:inner:rejected', reasonRequired: false },
  ],
  schema: {
    type: 'object',
    properties: {
      refundAmount: { type: 'number', title: 'Refund amount' },
      orderDate: { type: 'string', readOnly: true },
      replyDraft: { type: 'string', title: 'Reply draft' },
      itemCount: { type: 'integer', title: 'Item count' },
      expedite: { type: 'boolean', title: 'Expedite' },
      tags: { type: 'array' },
    },
    required: ['refundAmount'],
  },
} satisfies DecisionRequest;

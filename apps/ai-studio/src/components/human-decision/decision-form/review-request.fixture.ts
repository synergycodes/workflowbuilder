import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

// A request with every field kind the form knows: editable number, read-only string, editable string, unsupported array.
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
      tags: { type: 'array' },
    },
    required: ['refundAmount'],
  },
} satisfies DecisionRequest;

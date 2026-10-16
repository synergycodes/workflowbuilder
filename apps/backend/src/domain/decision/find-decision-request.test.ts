import { describe, expect, it } from 'vitest';

import { workflowSnapshotSchema } from '../mapper/snapshot-schema';
import { findDecisionRequest } from './find-decision-request';

const approve = { name: 'approve', label: 'Approve', effect: 'resume', port: 'approved' };
const reject = { name: 'reject', label: 'Reject', effect: 'reject', port: 'rejected' };
const actions = [approve, reject];

// Declares a field of its own, so a test can prove the route never reads it.
const authoredForm = { type: 'object', properties: { refundAmount: { type: 'number' } } };
const picks = [
  { label: 'Refund amount', reference: '{{nodes.source-1.refundAmount}}', type: 'number' },
  { label: 'Tags', reference: '{{nodes.source-1.tags}}', type: 'array' },
];

const snapshot = workflowSnapshotSchema.parse({
  nodes: [
    { id: 'source-1', data: { type: 'product/any', properties: {} } },
    { id: 'plain', data: { type: 'product/any' } },
    {
      id: 'review-1',
      data: {
        type: 'product/any',
        properties: { decisionRequest: { version: 1, actions, schema: authoredForm }, editableFields: picks },
      },
    },
    {
      id: 'review-2',
      data: { type: 'product/any', properties: { decisionRequest: { version: 1, actions, schema: authoredForm } } },
    },
  ],
  edges: [
    { id: 'e1', source: 'source-1', target: 'review-1' },
    { id: 'e2', source: 'source-1', target: 'review-2' },
  ],
});

describe('findDecisionRequest', () => {
  it('finds the request of the node, with reasonRequired materialised', () => {
    const found = findDecisionRequest(snapshot, 'review-1');

    expect(found.error).toBeUndefined();
    expect(found.request?.actions).toEqual([approve, { ...reject, reasonRequired: false }]);
  });

  it("builds the form schema from the node's editableFields, not from the authored schema", () => {
    expect(findDecisionRequest(snapshot, 'review-1').request?.schema).toEqual({
      type: 'object',
      properties: { 'nodes/source-1/refundAmount': { type: 'number', title: 'Refund amount' } },
      required: ['nodes/source-1/refundAmount'],
    });
  });

  it('declares no field for a node without editableFields', () => {
    expect(findDecisionRequest(snapshot, 'review-2').request?.schema).toEqual({
      type: 'object',
      properties: {},
      required: [],
    });
  });

  it('tells a missing node from a node that carries no request', () => {
    expect(findDecisionRequest(snapshot, 'ghost')).toEqual({ error: 'node_not_found' });
    expect(findDecisionRequest(snapshot, 'source-1')).toEqual({ error: 'node_without_decision_request' });
    expect(findDecisionRequest(snapshot, 'plain')).toEqual({ error: 'node_without_decision_request' });
  });
});

import { describe, expect, it } from 'vitest';

import { workflowSnapshotSchema } from '../mapper/snapshot-schema';
import { findDecisionRequest } from './find-decision-request';

const approve = { name: 'approve', label: 'Approve', effect: 'resume' };
const reject = { name: 'reject', label: 'Reject', effect: 'reject' };

const snapshot = workflowSnapshotSchema.parse({
  nodes: [
    { id: 'source-1', data: { type: 'product/any', properties: {} } },
    { id: 'plain', data: { type: 'product/any' } },
    {
      id: 'review-1',
      data: {
        type: 'product/any',
        properties: {
          decisionRequest: { version: 1, actions: [approve, reject], schema: { type: 'object', properties: {} } },
        },
      },
    },
  ],
  edges: [{ id: 'e1', source: 'source-1', target: 'review-1' }],
});

describe('findDecisionRequest', () => {
  it('finds the request of the node, with the parser defaults on its actions', () => {
    const found = findDecisionRequest(snapshot, 'review-1');

    expect(found.error).toBeUndefined();
    expect(found.request?.actions).toEqual([
      { ...approve, port: 'approved' },
      { ...reject, port: 'rejected', reasonRequired: false },
    ]);
  });

  it('tells a missing node from a node that carries no request', () => {
    expect(findDecisionRequest(snapshot, 'ghost')).toEqual({ error: 'node_not_found' });
    expect(findDecisionRequest(snapshot, 'source-1')).toEqual({ error: 'node_without_decision_request' });
    expect(findDecisionRequest(snapshot, 'plain')).toEqual({ error: 'node_without_decision_request' });
  });
});

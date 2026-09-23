import { describe, expect, it } from 'vitest';

import { readDecisionRequest } from './decision-request';
import { reviewRequest } from './review-request.fixture';

describe('readDecisionRequest', () => {
  it('reads the schema, the offered actions and the declared proposal source', () => {
    expect(readDecisionRequest({ ...reviewRequest, proposalSourceNodeId: 'draft-1' })).toEqual({
      schema: reviewRequest.schema,
      actions: {
        resume: { name: 'approve', label: 'Approve' },
        reject: { name: 'reject', label: 'Reject', reasonRequired: false },
      },
      proposalSourceNodeId: 'draft-1',
    });
  });

  it.each([
    ['not declared', undefined],
    ['blank', ''],
    ['not a string', 7],
  ])('reads no proposal source when it is %s', (_name, proposalSourceNodeId) => {
    expect(readDecisionRequest({ ...reviewRequest, proposalSourceNodeId })?.proposalSourceNodeId).toBeUndefined();
  });

  it.each([
    ['undefined', undefined],
    ['a string', 'request'],
    ['an array', [reviewRequest]],
    ['actions that are not an array', { ...reviewRequest, actions: 'approve' }],
    ['no resume action', { ...reviewRequest, actions: reviewRequest.actions.slice(1) }],
    ['a schema that is not an object', { ...reviewRequest, schema: 'form' }],
    ['a schema without properties', { ...reviewRequest, schema: { type: 'object' } }],
  ])('reads nothing from %s', (_name, value) => {
    expect(readDecisionRequest(value)).toBeUndefined();
  });
});

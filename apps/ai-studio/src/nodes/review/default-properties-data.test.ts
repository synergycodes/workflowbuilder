import { getHandleId } from '@workflowbuilder/sdk';
import { describe, expect, it } from 'vitest';

import { defaultPropertiesData, reviewDecisionRequest } from './default-properties-data';

describe('reviewDecisionRequest', () => {
  const ports = reviewDecisionRequest.actions.map((action) => action.port);

  it('routes on the SDK handle ids the template renders, one per action', () => {
    expect(ports).toEqual([
      getHandleId({ handleType: 'source', innerId: 'approved' }),
      getHandleId({ handleType: 'source', innerId: 'escalated' }),
      getHandleId({ handleType: 'source', innerId: 'rejected' }),
    ]);
  });

  it('gives every action a port of its own and never the reserved error route', () => {
    expect(new Set(ports).size).toBe(ports.length);
    expect(ports).not.toContain('errorRoute');
  });

  it('is a version 1 request: two resume actions, one reject that needs a reason, no rerun, an empty form, no proposal source', () => {
    expect(reviewDecisionRequest.version).toBe(1);
    expect(reviewDecisionRequest.actions.map((action) => action.name)).toEqual(['approve', 'escalate', 'reject']);
    expect(reviewDecisionRequest.actions.map((action) => action.effect)).toEqual(['resume', 'resume', 'reject']);
    expect(reviewDecisionRequest.actions[2]).toMatchObject({ effect: 'reject', reasonRequired: true });
    expect(reviewDecisionRequest.schema).toEqual({ type: 'object', properties: {} });
    expect(reviewDecisionRequest).not.toHaveProperty('proposalSourceNodeId');
    expect(reviewDecisionRequest).not.toHaveProperty('deadline');
  });

  it('is what a node dropped from the palette carries, titled Review', () => {
    expect(defaultPropertiesData.decisionRequest).toBe(reviewDecisionRequest);
    expect(defaultPropertiesData.label).toBe('Review');
  });
});

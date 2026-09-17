import { getHandleId } from '@workflowbuilder/sdk';
import { describe, expect, it } from 'vitest';

import { defaultDecisionRequest, defaultPropertiesData } from './default-properties-data';

describe('defaultDecisionRequest', () => {
  const ports = defaultDecisionRequest.actions.map((action) => action.port);

  it('routes on the SDK handle ids the template renders', () => {
    expect(ports).toEqual([
      getHandleId({ handleType: 'source', innerId: 'approved' }),
      getHandleId({ handleType: 'source', innerId: 'rejected' }),
    ]);
  });

  it('gives reject a port of its own and never the reserved error route', () => {
    expect(new Set(ports).size).toBe(ports.length);
    expect(ports).not.toContain('errorRoute');
  });

  it('is a version 1 request: one resume, one reject, no rerun, an empty form, no proposal source', () => {
    expect(defaultDecisionRequest.version).toBe(1);
    expect(defaultDecisionRequest.actions.map((action) => action.effect)).toEqual(['resume', 'reject']);
    expect(defaultDecisionRequest.schema).toEqual({ type: 'object', properties: {} });
    expect(defaultDecisionRequest).not.toHaveProperty('proposalSourceNodeId');
    expect(defaultDecisionRequest).not.toHaveProperty('deadline');
  });

  it('is what a node dropped from the palette carries', () => {
    expect(defaultPropertiesData.decisionRequest).toBe(defaultDecisionRequest);
  });
});

import { describe, expect, it } from 'vitest';

import { PermanentNodeExecutionError } from '@workflow-builder/execution-core';
import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import type { HumanDecisionNode } from '../domain/ai-studio-nodes';
import { executeHumanDecision } from './human-decision';

const request: DecisionRequest = {
  version: 1,
  actions: [
    { name: 'approve', label: 'Approve', effect: 'resume', port: 'source:inner:approved' },
    { name: 'reject', label: 'Reject', effect: 'reject', port: 'source:inner:rejected', reasonRequired: false },
  ],
  schema: { type: 'object', properties: {} },
};

function humanDecisionNode(decisionRequest?: DecisionRequest): HumanDecisionNode {
  return {
    id: 'human-1',
    type: 'ai-studio/human-decision',
    config: {},
    ...(decisionRequest === undefined ? {} : { decisionRequest }),
  };
}

describe('executeHumanDecision', () => {
  it('returns exactly { waiting: true } for a node that carries a request', () => {
    expect(executeHumanDecision(humanDecisionNode(request))).toStrictEqual({ waiting: true });
  });

  it('is not a second validator: a request with no actions still parks', () => {
    expect(executeHumanDecision(humanDecisionNode({ ...request, actions: [] }))).toStrictEqual({ waiting: true });
  });

  it('fails permanently with code "decision_request_missing" for a node without a request', () => {
    let thrown: unknown;
    try {
      executeHumanDecision(humanDecisionNode());
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(PermanentNodeExecutionError);
    const error = thrown as PermanentNodeExecutionError;
    expect(error.code).toBe('decision_request_missing');
    expect(error.classification).toBe('permanent');
    expect(error.message).toContain("'human-1'");
  });
});

import { describe, expect, it } from 'vitest';

import { type ExecutionContext, NodeExecutionError } from '@workflow-builder/execution-core';

import type { DecisionNode } from '../domain/ai-studio-nodes';
import { executeDecision } from './decision';

function context(): ExecutionContext {
  return {
    workflowId: 'wf',
    executionId: 'exec',
    triggerPayload: {},
    nodeOutputs: {},
    variables: {},
    global: {},
  };
}

function decisionNode(branches: DecisionNode['config']['decisionBranches']): DecisionNode {
  return {
    id: 'd1',
    type: 'ai-studio/decision',
    config: { decisionBranches: branches },
  };
}

describe('executeDecision', () => {
  it('returns the first matching branch', () => {
    const node = decisionNode([
      {
        sourceHandle: 'eq',
        conditions: [{ x: 'a', y: 'a', comparisonOperator: 'isEqual' }],
      },
      {
        sourceHandle: 'always',
        conditions: [{ x: 'a', y: 'a', comparisonOperator: 'isEqual' }],
      },
    ]);

    const result = executeDecision(node, context());

    expect(result).toEqual({ output: { matchedBranch: 'eq' }, nextPort: 'eq' });
  });

  it('skips non-matching branches and returns the next match', () => {
    const node = decisionNode([
      {
        sourceHandle: 'no',
        conditions: [{ x: 'a', y: 'b', comparisonOperator: 'isEqual' }],
      },
      {
        sourceHandle: 'yes',
        conditions: [{ x: 'a', y: 'a', comparisonOperator: 'isEqual' }],
      },
    ]);

    const result = executeDecision(node, context());

    expect(result.nextPort).toBe('yes');
  });

  it('throws NodeExecutionError with code "no_branch_matched" when nothing matches', () => {
    const node = decisionNode([
      {
        sourceHandle: 'b1',
        conditions: [{ x: 'a', y: 'b', comparisonOperator: 'isEqual' }],
      },
      {
        sourceHandle: 'b2',
        conditions: [{ x: 'a', y: 'c', comparisonOperator: 'isEqual' }],
      },
    ]);

    expect(() => executeDecision(node, context())).toThrowError(NodeExecutionError);

    try {
      executeDecision(node, context());
    } catch (error) {
      expect(error).toBeInstanceOf(NodeExecutionError);
      expect((error as NodeExecutionError).code).toBe('no_branch_matched');
      expect((error as NodeExecutionError).message).toMatch(/no matching branch/i);
    }
  });

  it('treats a branch with no conditions as the catch-all', () => {
    const node = decisionNode([
      {
        sourceHandle: 'no',
        conditions: [{ x: 'a', y: 'b', comparisonOperator: 'isEqual' }],
      },
      {
        sourceHandle: 'fallback',
        conditions: [],
      },
    ]);

    const result = executeDecision(node, context());

    expect(result.nextPort).toBe('fallback');
  });
});

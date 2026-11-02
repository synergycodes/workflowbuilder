import { describe, expect, it } from 'vitest';

import {
  type ExecutionContext,
  NodeExecutionError,
  PermanentNodeExecutionError,
} from '@workflow-builder/execution-core';

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

  it('orders bare HH:mm times within the day for isBefore and isAfter', () => {
    const node = decisionNode([
      {
        sourceHandle: 'after',
        conditions: [{ x: '09:07', y: '10:00', comparisonOperator: 'isAfter' }],
      },
      {
        sourceHandle: 'before',
        conditions: [{ x: '09:07', y: '10:00:30', comparisonOperator: 'isBefore' }],
      },
    ]);

    expect(executeDecision(node, context()).nextPort).toBe('before');
  });

  it('orders a bare time against the clock of a datetime, never against a bare date', () => {
    const node = decisionNode([
      {
        sourceHandle: 'date',
        conditions: [{ x: '09:07', y: '2024-01-15', comparisonOperator: 'isBefore' }],
      },
      {
        sourceHandle: 'clock',
        conditions: [{ x: '09:07', y: '2024-01-15T10:00:00Z', comparisonOperator: 'isBefore' }],
      },
    ]);

    expect(executeDecision(node, context()).nextPort).toBe('clock');
  });

  it('throws a permanent NodeExecutionError with code "no_branch_matched" when nothing matches', () => {
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

    const decide = () => executeDecision(node, context());

    expect(decide).toThrow(PermanentNodeExecutionError);
    expect(decide).toThrow(
      expect.objectContaining({ code: 'no_branch_matched', message: expect.stringMatching(/no matching branch/i) }),
    );
    // A branch with no conditions never matches, so the remediation must not suggest one.
    expect(decide).toThrow(expect.objectContaining({ message: expect.stringContaining('always true') }));
  });

  it('treats a branch with no conditions as non-matching (so callers must throw or use explicit operators)', () => {
    // Empty conditions array — branchMatches returns false, so this is NOT
    // a default. If someone wants a default, they need a branch whose
    // conditions evaluate to true (e.g. isEqual 'x' 'x').
    const node = decisionNode([
      {
        sourceHandle: 'empty',
        conditions: [],
      },
    ]);

    expect(() => executeDecision(node, context())).toThrowError(NodeExecutionError);
  });
});

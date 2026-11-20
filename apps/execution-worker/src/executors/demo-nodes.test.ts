import { describe, expect, it, vi } from 'vitest';

import type { ExecutionContext } from '@workflow-builder/execution-core';
import type {
  DemoActionNode,
  DemoConditionalNode,
  DemoDecisionNode,
  DemoNotificationNode,
  DemoTriggerNode,
} from '@workflow-builder/types/workflow-execution/demo-execution';

import {
  executeDemoAction,
  executeDemoConditional,
  executeDemoDecision,
  executeDemoMultiPort,
  executeDemoNotification,
  executeDemoTrigger,
} from './demo-nodes';

function context(): ExecutionContext {
  return {
    workflowId: 'workflow',
    executionId: 'execution',
    triggerPayload: { orderId: '123' },
    nodeOutputs: {},
    variables: {},
    global: {},
  };
}

describe('executable demo node executors', () => {
  it('produces the manual trigger contract', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'));
    const node: DemoTriggerNode = { id: 'trigger', type: 'trigger', role: 'start', config: {} };

    expect(executeDemoTrigger(node, context())).toEqual({
      output: {
        eventType: 'manual',
        timestamp: '2026-08-30T12:00:00.000Z',
        payload: { orderId: '123' },
      },
    });
    vi.useRealTimers();
  });

  it('simulates actions without performing I/O', () => {
    const node: DemoActionNode = { id: 'action', type: 'action', config: { type: 'makeApiCall' } };
    expect(executeDemoAction(node)).toEqual({
      output: {
        status: 'success',
        result: { simulated: true, performed: false, actionType: 'makeApiCall' },
        errorMessage: '',
      },
    });
  });

  it('routes conditionals through literal true and false ports', () => {
    const node: DemoConditionalNode = {
      id: 'conditional',
      type: 'conditional',
      config: { conditionsArray: [{ x: 'yes', y: 'yes', comparisonOperator: 'isEqual' }] },
    };
    expect(executeDemoConditional(node, context())).toMatchObject({
      output: { result: true },
      nextPort: 'true',
    });
    expect(executeDemoConditional({ ...node, config: { conditionsArray: [] } }, context())).toEqual({
      output: { result: false, matchedCondition: '' },
      nextPort: 'false',
    });
  });

  it('selects the first matching decision branch', () => {
    const node: DemoDecisionNode = {
      id: 'decision',
      type: 'decision',
      config: {
        decisionBranches: [
          {
            id: 'first',
            sourceHandle: 'first',
            label: 'First',
            conditions: [{ x: 'a', y: 'a', comparisonOperator: 'isEqual' }],
          },
          {
            id: 'second',
            sourceHandle: 'second',
            label: 'Second',
            conditions: [{ x: 'a', y: 'a', comparisonOperator: 'isEqual' }],
          },
        ],
      },
    };
    expect(executeDemoDecision(node, context())).toEqual({
      output: { selectedBranch: 'First', branchIndex: 0 },
      nextPort: 'first',
    });
  });

  it('uses the explicit structural default route when no decision branch matches', () => {
    const node: DemoDecisionNode = {
      id: 'decision',
      type: 'decision',
      config: {
        decisionBranches: [
          {
            id: 'never',
            sourceHandle: 'never',
            label: 'Never',
            conditions: [{ x: 'a', y: 'b', comparisonOperator: 'isEqual' }],
          },
        ],
      },
    };
    expect(executeDemoDecision(node, context())).toEqual({
      output: { selectedBranch: 'Default', branchIndex: 1 },
      nextPort: 'default',
    });
  });

  it('simulates notifications with zero I/O', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'));
    const node: DemoNotificationNode = {
      id: 'notification',
      type: 'notification',
      config: { type: 'email', recipient: 'person@example.test', message: 'Hi' },
    };
    expect(executeDemoNotification(node)).toEqual({
      output: {
        sent: false,
        sentAt: '2026-08-30T12:00:00.000Z',
        recipient: 'person@example.test',
        channel: 'email',
      },
    });
    vi.useRealTimers();
  });

  it('fans out multi-port nodes through core by returning no nextPort', () => {
    expect(executeDemoMultiPort()).toEqual({ output: { routed: true } });
    expect(executeDemoMultiPort()).not.toHaveProperty('nextPort');
  });
});

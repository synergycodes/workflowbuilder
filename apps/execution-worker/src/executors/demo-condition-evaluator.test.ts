import { describe, expect, it } from 'vitest';

import { type ExecutionContext, NodeExecutionError } from '@workflow-builder/execution-core';
import type { DemoCondition } from '@workflow-builder/types/workflow-execution/demo-execution';

import { evaluateCondition, evaluateConditions } from './demo-condition-evaluator';

const context: ExecutionContext = {
  workflowId: 'workflow',
  executionId: 'execution',
  triggerPayload: { score: 10, name: 'Alice' },
  nodeOutputs: { previous: { status: 'ready' } },
  variables: {},
  global: {},
};

function condition(comparisonOperator: DemoCondition['comparisonOperator'], x: string, y: string): DemoCondition {
  return { x, y, comparisonOperator };
}

describe('demo condition evaluator', () => {
  it.each([
    ['isEqual', 'Hello', 'Hello', true],
    ['isNotEqual', 'Hello', 'hello', true],
    ['isContaining', 'Hello World', 'WORLD', true],
    ['isNotContaining', 'Hello World', 'missing', true],
    ['isGreaterThan', '10', '9', true],
    ['isLessThan', '9', '10', true],
    ['isGreaterThanOrEqual', '10', '10', true],
    ['isLessThanOrEqual', '10', '10', true],
    ['isBefore', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z', true],
    ['isAfter', '2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z', true],
  ] satisfies [DemoCondition['comparisonOperator'], string, string, boolean][])(
    'evaluates %s',
    (operator, left, right, expected) => {
      expect(evaluateCondition(condition(operator, left, right), context)).toBe(expected);
    },
  );

  it('resolves template operands against execution context', () => {
    expect(evaluateCondition(condition('isEqual', '{{trigger.name}}', 'Alice'), context)).toBe(true);
    expect(evaluateCondition(condition('isEqual', '{{nodes.previous.status}}', 'ready'), context)).toBe(true);
  });

  it('combines later conditions with OR or AND by default', () => {
    const first = condition('isEqual', 'a', 'b');
    const orCondition = { ...condition('isEqual', 'a', 'a'), logicalOperator: 'OR' as const };
    expect(evaluateConditions([first, orCondition], context).result).toBe(true);
    expect(evaluateConditions([condition('isEqual', 'a', 'a'), condition('isEqual', 'a', 'b')], context).result).toBe(
      false,
    );
  });

  it('returns the first true condition only when the final expression is true', () => {
    const match = condition('isEqual', 'a', 'a');
    expect(evaluateConditions([match], context)).toEqual({ result: true, matchedCondition: 'conditions:0' });
    expect(evaluateConditions([], context)).toEqual({ result: false, matchedCondition: '' });
  });

  it.each([
    ['isGreaterThan', 'not-a-number', '1'],
    ['isBefore', 'not-a-date', '2026-01-01'],
  ] satisfies [DemoCondition['comparisonOperator'], string, string][])(
    'rejects invalid operands for %s',
    (operator, left, right) => {
      expect(() => evaluateCondition(condition(operator, left, right), context)).toThrowError(NodeExecutionError);
      expect(() => evaluateCondition(condition(operator, left, right), context)).toThrowError(
        expect.objectContaining({ code: 'invalid_condition_operand' }),
      );
    },
  );
});

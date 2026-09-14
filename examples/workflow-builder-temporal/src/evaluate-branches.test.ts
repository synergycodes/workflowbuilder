import { PermanentNodeExecutionError } from '@workflowbuilder/temporal';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { conditionsHold, pickBranch, resolveOperand } from './evaluate-branches';
import type { SampleCondition, SampleDecisionBranch } from './nodes';

const context = {
  triggerPayload: { amount: 250, customer: 'Ada', due: '2026-01-15' },
  nodeOutputs: {
    'trigger-1': { amount: 250, customer: 'Ada' },
    'action-1': { delivered: true, attempt: 2, meta: { tag: 'x' } },
  },
};

function row(
  x: string,
  comparisonOperator: SampleCondition['comparisonOperator'],
  y: string,
  logicalOperator: SampleCondition['logicalOperator'] = 'AND',
): SampleCondition {
  return { x, comparisonOperator, y, logicalOperator };
}

function branch(label: string, conditions: SampleCondition[]): SampleDecisionBranch {
  return { id: label, sourceHandle: `source:inner:${label}`, label, conditions };
}

function permanentWithCode(code: string) {
  return (error: unknown) => error instanceof PermanentNodeExecutionError && error.code === code;
}

const holds = row('{{trigger.amount}}', 'isGreaterThan', '100');
const fails = row('{{trigger.amount}}', 'isLessThan', '100');

test('resolves trigger and node references, nested paths included, and keeps surrounding text', () => {
  assert.equal(resolveOperand('{{trigger.customer}}', context), 'Ada');
  assert.equal(resolveOperand('{{nodes.action-1.meta.tag}}', context), 'x');
  assert.equal(resolveOperand('100', context), '100');
  assert.equal(resolveOperand('id {{nodes.trigger-1.amount}}', context), 'id 250');
});

test('stringifies non-string values the way execution-core does', () => {
  assert.equal(resolveOperand('{{trigger.amount}}', context), '250');
  assert.equal(resolveOperand('{{nodes.action-1.delivered}}', context), 'true');
  assert.equal(resolveOperand('{{nodes.action-1.meta}}', context), '{"tag":"x"}');
});

test('rejects a reference it cannot read as a permanent error', () => {
  assert.throws(() => resolveOperand('{{amount}}', context), permanentWithCode('operand_invalid'));
  assert.throws(() => resolveOperand('{{global.x}}', context), permanentWithCode('operand_invalid'));
});

test('rejects a reference to a missing value as a permanent error', () => {
  assert.throws(() => resolveOperand('{{trigger.missing}}', context), permanentWithCode('operand_unresolved'));
  assert.throws(() => resolveOperand('{{nodes.nope.amount}}', context), permanentWithCode('operand_unresolved'));
});

test('compares numbers with isGreaterThan, isLessThan and the OrEqual forms', () => {
  assert.equal(conditionsHold([row('{{trigger.amount}}', 'isGreaterThan', '100')], context), true);
  assert.equal(conditionsHold([row('{{trigger.amount}}', 'isLessThan', '100')], context), false);
  assert.equal(conditionsHold([row('{{trigger.amount}}', 'isGreaterThanOrEqual', '250')], context), true);
  assert.equal(conditionsHold([row('{{trigger.amount}}', 'isLessThanOrEqual', '250')], context), true);
  assert.equal(conditionsHold([row('{{trigger.amount}}', 'isGreaterThan', 'abc')], context), false);
});

test('compares text with isEqual and isNotEqual after resolving both sides', () => {
  assert.equal(conditionsHold([row('{{trigger.customer}}', 'isEqual', 'Ada')], context), true);
  assert.equal(conditionsHold([row('{{trigger.customer}}', 'isNotEqual', 'Ada')], context), false);
  assert.equal(conditionsHold([row('{{trigger.amount}}', 'isEqual', '250')], context), true);
});

test('isContaining and isNotContaining ignore case', () => {
  assert.equal(conditionsHold([row('{{trigger.customer}}', 'isContaining', 'ada')], context), true);
  assert.equal(conditionsHold([row('{{trigger.customer}}', 'isNotContaining', 'ADA')], context), false);
});

test('isBefore and isAfter compare dates strictly and never hold for text that is not a date', () => {
  assert.equal(conditionsHold([row('{{trigger.due}}', 'isBefore', '2026-02-01')], context), true);
  assert.equal(conditionsHold([row('{{trigger.due}}', 'isAfter', '2026-02-01')], context), false);
  assert.equal(conditionsHold([row('{{trigger.due}}', 'isBefore', '2026-01-15')], context), false);
  assert.equal(conditionsHold([row('{{trigger.due}}', 'isAfter', '2026-01-15')], context), false);
  assert.equal(conditionsHold([row('soon', 'isAfter', '2026-01-01')], context), false);
});

test("joins rows left to right with each row's own logical operator, ignoring the first row's", () => {
  assert.equal(conditionsHold([holds, row('{{trigger.amount}}', 'isLessThan', '100', 'OR')], context), true);
  assert.equal(conditionsHold([holds, row('{{trigger.amount}}', 'isLessThan', '100', 'AND')], context), false);
  assert.equal(conditionsHold([row('{{trigger.amount}}', 'isLessThan', '100', 'OR'), holds], context), false);
});

test('a branch with no condition rows always holds', () => {
  assert.equal(conditionsHold([], context), true);
  assert.equal(pickBranch([branch('a', [fails]), branch('b', [])], context).label, 'b');
});

test('the first branch whose conditions hold wins and later branches are not evaluated', () => {
  const later = branch('c', [row('{{trigger.missing}}', 'isEqual', 'x')]);
  assert.equal(pickBranch([branch('a', [fails]), branch('b', [holds]), later], context).label, 'b');
});

test('throws no_branch_matched as a permanent error when nothing holds', () => {
  assert.throws(() => pickBranch([branch('a', [fails])], context), permanentWithCode('no_branch_matched'));
});

test('rejects an unknown comparison operator as a permanent error', () => {
  const unknown = row('1', 'isSomething' as SampleCondition['comparisonOperator'], '1');
  assert.throws(() => conditionsHold([unknown], context), permanentWithCode('operator_unknown'));
});

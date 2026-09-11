import { PermanentNodeExecutionError } from '@workflowbuilder/temporal';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { evaluateCondition } from './evaluate-condition';

test('compares numbers', () => {
  assert.equal(evaluateCondition('amount > 100', { amount: 250 }), true);
  assert.equal(evaluateCondition('amount > 100', { amount: 50 }), false);
  assert.equal(evaluateCondition('amount >= 100', { amount: 100 }), true);
  assert.equal(evaluateCondition('amount < 100', { amount: 100 }), false);
  assert.equal(evaluateCondition('amount <= 100', { amount: 100 }), true);
});

test('compares with == and != using the literal as written, quotes stripped', () => {
  assert.equal(evaluateCondition('customer == "Ada"', { customer: 'Ada' }), true);
  assert.equal(evaluateCondition("customer != 'Ada'", { customer: 'Bob' }), true);
  assert.equal(evaluateCondition('amount == 250', { amount: 250 }), true);
});

test('a missing field never satisfies a numeric comparison', () => {
  assert.equal(evaluateCondition('amount > 100', {}), false);
  assert.equal(evaluateCondition('amount < 100', {}), false);
});

test('rejects an expression it cannot read as a permanent error', () => {
  assert.throws(() => evaluateCondition('amount is big', { amount: 1 }), PermanentNodeExecutionError);
  assert.throws(() => evaluateCondition('', {}), /Cannot read condition ""/);
});

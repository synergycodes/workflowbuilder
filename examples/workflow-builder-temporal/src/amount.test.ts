import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AMOUNT_RANGE, drawAmount, parseAmount } from './amount';

test('draws whole amounts inside the range, on both sides of the threshold', () => {
  const draws = Array.from({ length: 1000 }, () => drawAmount());

  assert.equal(
    draws.every((amount) => Number.isInteger(amount) && amount >= AMOUNT_RANGE.min && amount <= AMOUNT_RANGE.max),
    true,
  );
  assert.equal(
    draws.some((amount) => amount > 100),
    true,
  );
  assert.equal(
    draws.some((amount) => amount <= 100),
    true,
  );
});

test('reads a forced amount from the command line', () => {
  assert.equal(parseAmount('50'), 50);
  assert.equal(parseAmount('1'), 1);
});

test('no argument means no forced amount', () => {
  assert.equal(parseAmount(), undefined);
});

test('rejects anything that is not a positive whole number', () => {
  for (const raw of ['abc', '0', '-5', '1.5', '']) {
    assert.throws(() => parseAmount(raw), /positive whole number/);
  }
});

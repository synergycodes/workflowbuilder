import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AMOUNT_RANGE, drawAmount } from './amount';

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

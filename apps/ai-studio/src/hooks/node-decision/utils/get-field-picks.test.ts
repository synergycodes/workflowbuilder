import { describe, expect, it } from 'vitest';

import { getFieldPicks } from './get-field-picks';

const pick = { label: 'Amount', reference: '{{nodes.a.amount}}', type: 'number' };

describe('getFieldPicks', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an object', { label: 'x' }],
    ['a string', 'amount'],
  ])('is empty for %s', (_name, value) => {
    expect(getFieldPicks(value)).toEqual([]);
  });

  it('keeps the well-formed picks in order and leaves the rest out', () => {
    const entries = [pick, null, 'text', { label: 'No reference', type: 'string' }, { ...pick, label: 'Second' }];

    expect(getFieldPicks(entries)).toEqual([pick, { ...pick, label: 'Second' }]);
  });
});

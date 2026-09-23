import { describe, expect, it } from 'vitest';

import { editsOf, proposedValues, withEdits } from './decision-values';
import { reviewRequest } from './review-request.fixture';

const { schema } = reviewRequest;
const proposal = {
  refundAmount: 80,
  orderDate: '2026-09-01',
  replyDraft: 'Dear customer',
  internalReasoning: 'hidden',
};

describe('proposedValues', () => {
  it('takes the declared fields from the proposal and leaves an undeclared one out', () => {
    expect(proposedValues(proposal, schema)).toEqual({
      refundAmount: 80,
      orderDate: '2026-09-01',
      replyDraft: 'Dear customer',
    });
  });

  it('omits a declared field the proposal does not carry, so a required one reads as missing', () => {
    expect(Object.keys(proposedValues({ orderDate: '2026-09-01' }, schema))).toEqual(['orderDate']);
  });

  it.each([
    ['a string proposal', 'Refund amount: 80'],
    ['undefined', undefined],
    ['an array', [80]],
  ])('is empty for %s', (_name, output) => {
    expect(proposedValues(output, schema)).toEqual({});
  });
});

describe('editsOf', () => {
  const proposed = proposedValues(proposal, schema);

  it('is empty when nothing changed', () => {
    expect(editsOf(proposed, { ...proposed }, schema)).toEqual({});
  });

  it('carries every declared editable field that changed', () => {
    expect(editsOf(proposed, { ...proposed, refundAmount: 120, replyDraft: 'Refunded' }, schema)).toEqual({
      refundAmount: 120,
      replyDraft: 'Refunded',
    });
  });

  it('never carries a read-only field, even when the value differs', () => {
    expect(editsOf(proposed, { ...proposed, orderDate: '2000-01-01' }, schema)).toEqual({});
  });

  it('never carries a field the form does not declare', () => {
    expect(editsOf(proposed, { ...proposed, internalReasoning: 'changed' }, schema)).toEqual({});
  });

  it('sends an emptied editable field as null', () => {
    expect(editsOf(proposed, { ...proposed, refundAmount: undefined }, schema)).toEqual({ refundAmount: null });
  });

  it('carries a value typed into a field that started empty', () => {
    expect(editsOf({}, { refundAmount: 120 }, schema)).toEqual({ refundAmount: 120 });
  });
});

describe('withEdits', () => {
  const proposed = proposedValues(proposal, schema);

  it('applies the edits over the proposal', () => {
    expect(withEdits(proposed, { refundAmount: 120 })).toEqual({ ...proposed, refundAmount: 120 });
  });

  it('leaves an emptied field without a value', () => {
    expect(withEdits(proposed, { replyDraft: null })).not.toHaveProperty('replyDraft');
  });

  it('undoes editsOf: the values it settles are the ones the person left', () => {
    const current = { ...proposed, refundAmount: 120, replyDraft: undefined };

    expect(withEdits(proposed, editsOf(proposed, current, schema))).toEqual({
      refundAmount: 120,
      orderDate: '2026-09-01',
    });
  });
});

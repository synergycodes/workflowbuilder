import { describe, expect, it } from 'vitest';

import { fieldsOf } from './decision-fields';
import { editsOf, initialValues } from './decision-values';
import { reviewRequest } from './review-request.fixture';

const fields = fieldsOf(reviewRequest);
const proposal = {
  refundAmount: 80,
  orderDate: '2026-09-01',
  replyDraft: 'Dear customer',
  internalReasoning: 'hidden',
};

describe('initialValues', () => {
  it('shows the schema keys of an object proposal as text and ignores the rest', () => {
    const values = initialValues(proposal, fields);

    expect(values).toEqual({
      refundAmount: '80',
      orderDate: '2026-09-01',
      replyDraft: 'Dear customer',
      tags: undefined,
    });
    expect(Object.keys(values)).not.toContain('internalReasoning');
  });

  it('shows a number that arrived as a string, which a model output may well do', () => {
    expect(initialValues({ refundAmount: '80' }, fields)['refundAmount']).toBe('80');
  });

  it.each([
    ['a string proposal', 'Refund amount: 80'],
    ['undefined', undefined],
    ['an array', [80]],
  ])('leaves every field empty for %s', (_name, output) => {
    expect(initialValues(output, fields)).toEqual({
      refundAmount: '',
      orderDate: '',
      replyDraft: '',
      tags: undefined,
    });
  });
});

describe('editsOf', () => {
  const initial = initialValues({ ...proposal, tags: ['a'] }, fields);

  it('is empty when nothing changed', () => {
    expect(editsOf(initial, { ...initial }, fields)).toEqual({});
  });

  it('carries a changed editable field, parsed to its declared type', () => {
    expect(editsOf(initial, { ...initial, refundAmount: '120.5' }, fields)).toEqual({ refundAmount: 120.5 });
  });

  it('reports nothing while the box holds an unfinished decimal, and the value once it is finished', () => {
    expect(editsOf(initial, { ...initial, refundAmount: '80.' }, fields)).toEqual({});
    expect(editsOf(initial, { ...initial, refundAmount: '80.5' }, fields)).toEqual({ refundAmount: 80.5 });
  });

  it('never carries a read-only field, even when the value differs', () => {
    expect(editsOf(initial, { ...initial, orderDate: '2000-01-01' }, fields)).toEqual({});
  });

  it('never carries an unsupported field', () => {
    expect(editsOf(initial, { ...initial, tags: ['b'] }, fields)).toEqual({});
  });

  it('sends an emptied editable field as null', () => {
    expect(editsOf(initial, { ...initial, refundAmount: '' }, fields)).toEqual({ refundAmount: null });
    expect(editsOf(initial, { ...initial, replyDraft: '  ' }, fields)).toEqual({ replyDraft: null });
  });

  it('carries a value typed into a field that started empty', () => {
    const empty = initialValues(undefined, fields);

    expect(editsOf(empty, { ...empty, refundAmount: '120', replyDraft: 'Dear' }, fields)).toEqual({
      refundAmount: 120,
      replyDraft: 'Dear',
    });
  });

  it('does not report a field that was empty and stays empty', () => {
    const empty = initialValues(undefined, fields);

    expect(editsOf(empty, { ...empty }, fields)).toEqual({});
  });
});

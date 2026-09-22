import { describe, expect, it } from 'vitest';

import { refundReviewRequest } from '../../../data/refund-review-flow';
import { defaultDecisionRequest } from '../../../nodes/human-decision/default-properties-data';
import { fieldsOf, isDecisionRequest, isEditable } from './decision-fields';
import { reviewRequest } from './review-request.fixture';

describe('isDecisionRequest', () => {
  it('accepts an object with an actions array and a schema object', () => {
    expect(isDecisionRequest(reviewRequest)).toBe(true);
  });

  it.each([
    ['undefined', undefined],
    ['a string', 'request'],
    ['actions that are not an array', { actions: 'approve', schema: {} }],
    ['a schema that is not an object', { actions: [], schema: 'form' }],
    ['an array', [reviewRequest]],
  ])('refuses %s', (_name, value) => {
    expect(isDecisionRequest(value)).toBe(false);
  });
});

describe('fieldsOf', () => {
  it('lists the schema properties in order with label, type, readOnly and required', () => {
    expect(fieldsOf(reviewRequest)).toEqual([
      { key: 'refundAmount', label: 'Refund amount', kind: 'number', readOnly: false, required: true },
      { key: 'orderDate', label: 'orderDate', kind: 'text', readOnly: true, required: false },
      { key: 'replyDraft', label: 'Reply draft', kind: 'text', readOnly: false, required: false },
      { key: 'tags', label: 'tags', kind: 'unsupported', readOnly: false, required: false },
    ]);
  });

  it('folds integer into number and calls a type it cannot edit unsupported', () => {
    const [count, flag, blob] = fieldsOf({
      ...reviewRequest,
      schema: { type: 'object', properties: { count: { type: 'integer' }, flag: { type: 'boolean' }, blob: {} } },
    });
    expect(count?.kind).toBe('number');
    expect(flag?.kind).toBe('boolean');
    expect(blob?.kind).toBe('unsupported');
  });

  it('is empty for the palette preset, whose form is empty', () => {
    expect(fieldsOf(defaultDecisionRequest)).toEqual([]);
  });

  it('reads the template request: refundAmount required and editable, orderDate read-only', () => {
    const byKey = new Map(fieldsOf(refundReviewRequest).map((field) => [field.key, field]));
    expect(byKey.get('refundAmount')).toMatchObject({ kind: 'number', readOnly: false, required: true });
    expect(byKey.get('orderDate')).toMatchObject({ kind: 'text', readOnly: true });
  });
});

describe('isEditable', () => {
  it('is true only for a typed field that is not read-only', () => {
    expect(fieldsOf(reviewRequest).map((field) => [field.key, isEditable(field)])).toEqual([
      ['refundAmount', true],
      ['orderDate', false],
      ['replyDraft', true],
      ['tags', false],
    ]);
  });
});

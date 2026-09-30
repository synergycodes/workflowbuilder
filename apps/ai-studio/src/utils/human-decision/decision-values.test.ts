import { describe, expect, it } from 'vitest';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

// The real receiver, not a copy, as in ../../nodes/human-decision/decision-request-contract.test.ts
// (follow-up: decision-request-contract-test-home).
import { validateSubmittedDecision } from '../../../../backend/src/domain/decision/validate-submitted-decision';
import { blocksApproval, editsOf, proposedValues, withEdits } from './decision-values';
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

  it('never carries a field the form does not show, even as a new but equal object after a reconnect', () => {
    const withTags = { ...proposed, tags: ['vip'] };

    expect(editsOf(withTags, { ...withTags, tags: ['vip'] }, schema)).toEqual({});
  });

  it('never carries a field of a type the form leaves out, even when its value differs', () => {
    expect(editsOf({ ...proposed, itemCount: 3 }, { ...proposed, itemCount: 4 }, schema)).toEqual({});
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

  it('reads the empty text a text area hands back for a null as no edit, where the type allows null', () => {
    const nullable = { type: 'object', properties: { note: { type: ['string', 'null'] } } };

    expect(editsOf({ note: null }, { note: '' }, nullable)).toEqual({});
  });

  it('carries the empty text over a null where the type does not allow null', () => {
    expect(editsOf({ ...proposed, replyDraft: null }, { ...proposed, replyDraft: '' }, schema)).toEqual({
      replyDraft: '',
    });
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

describe('blocksApproval', () => {
  it('holds the decision back for a fault in a field the person can edit', () => {
    expect(blocksApproval(new Set(['refundAmount']), schema, {})).toBe(true);
  });

  it.each([
    ['a read-only field', 'orderDate'],
    ['a field of a type the form leaves out', 'itemCount'],
    ['a field the form does not declare', 'internalReasoning'],
  ])('lets it through for a fault in %s', (_name, field) => {
    expect(blocksApproval(new Set([field]), schema, {})).toBe(false);
  });

  it('lets it through when nothing is at fault', () => {
    expect(blocksApproval(new Set(), schema, { refundAmount: 120 })).toBe(false);
  });
});

describe('blocksApproval against the backend validator', () => {
  const noteRequest: DecisionRequest = {
    ...reviewRequest,
    schema: {
      type: 'object',
      properties: { note: { type: ['string', 'null'] }, remark: { type: 'string' } },
      required: ['note'],
    },
  };
  const replyRequest: DecisionRequest = {
    ...reviewRequest,
    schema: { ...reviewRequest.schema, required: ['refundAmount', 'replyDraft'] },
  };
  const proposed = proposedValues(proposal, schema);

  it.each<[string, DecisionRequest, Record<string, unknown>, Record<string, unknown>, boolean]>([
    ['an edited amount', reviewRequest, proposed, { ...proposed, refundAmount: 120 }, false],
    ['a required amount cleared', reviewRequest, proposed, { ...proposed, refundAmount: undefined }, true],
    ['a required reply emptied to an empty string', replyRequest, proposed, { ...proposed, replyDraft: '' }, true],
    ['a required reply emptied to whitespace', replyRequest, proposed, { ...proposed, replyDraft: '  ' }, true],
    [
      'a required reply the model left null, typed and cleared',
      replyRequest,
      { ...proposed, replyDraft: null },
      { ...proposed, replyDraft: '' },
      true,
    ],
    ['a nullable required note emptied to an empty string', noteRequest, { note: 'Call back' }, { note: '' }, true],
    ['a nullable required note emptied to whitespace', noteRequest, { note: 'Call back' }, { note: '  ' }, true],
    ['a nullable required note emptied to a tab and a newline', noteRequest, { note: 'x' }, { note: '\t\n' }, true],
    [
      'a required note the model left null and the person left alone',
      noteRequest,
      { note: null },
      { note: null },
      false,
    ],
    ['a required note the model left null, typed and cleared', noteRequest, { note: null }, { note: '' }, false],
    ['an emptied optional remark', noteRequest, { note: 'a', remark: 'b' }, { note: 'a', remark: '' }, false],
  ])(
    'blocks Approve for the edits the backend refuses, and only those: %s',
    (_name, request, before, after, blocked) => {
      const edits = editsOf(before, after, request.schema);
      const refusal = validateSubmittedDecision(request, { action: 'approve', edits });

      expect(blocksApproval(new Set(), request.schema, edits)).toBe(blocked);
      expect(refusal.error?.code).toBe(blocked ? 'required_field_missing' : undefined);
    },
  );
});

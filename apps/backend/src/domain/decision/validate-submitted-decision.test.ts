import { describe, expect, it } from 'vitest';

import type { DecisionContract } from '@workflow-builder/types/workflow-execution/decision-contract';

import { type SubmittedDecisionErrorCode, submittedDecisionErrorMessage } from './decision-issues';
import { type SubmittedDecision, validateSubmittedDecision } from './validate-submitted-decision';

const approve = { name: 'approve', label: 'Approve', effect: 'resume', port: 'approved' } as const;
const reject = { name: 'reject', label: 'Reject', effect: 'reject', port: 'rejected', reasonRequired: false } as const;
const reRequest = { name: 're-request', label: 'Ask again', effect: 'rerun-source', maxIterations: 3 } as const;

// As the parser leaves it: defaults present, every action explicit.
function contractWith(overrides: Partial<DecisionContract> = {}): DecisionContract {
  return {
    version: 1,
    actions: [approve, reject, reRequest],
    schema: {
      type: 'object',
      properties: {
        orderDate: { type: 'string', readOnly: true },
        customerEmail: { type: 'string', readOnly: true, 'x-pii': true },
        refundAmount: { type: 'number' },
        emailDraft: { type: 'string', readOnly: false },
        note: { type: 'string' },
      },
      required: ['refundAmount'],
    },
    ...overrides,
  };
}

describe('validateSubmittedDecision', () => {
  it.each<{ name: string; contract?: DecisionContract; call: SubmittedDecision; effect: string }>([
    { name: 'a resume without edits resumes', call: { action: 'approve' }, effect: 'resume' },
    { name: 'a resume with empty edits resumes', call: { action: 'approve', edits: {} }, effect: 'resume' },
    {
      name: 'a resume with an edit on an editable field resumes with edits',
      call: { action: 'approve', edits: { refundAmount: 42 } },
      effect: 'resume-with-edits',
    },
    {
      name: 'an explicit readOnly: false is editable',
      call: { action: 'approve', edits: { emailDraft: 'Dear customer' } },
      effect: 'resume-with-edits',
    },
    {
      name: 'a required field set to a value is fine',
      call: { action: 'approve', edits: { refundAmount: 0 } },
      effect: 'resume-with-edits',
    },
    {
      name: 'an optional field may be emptied',
      call: { action: 'approve', edits: { note: '' } },
      effect: 'resume-with-edits',
    },
    { name: 'a reject without a reason when none is required', call: { action: 'reject' }, effect: 'reject' },
    {
      name: 'a reject with a reason when one is required',
      contract: contractWith({ actions: [approve, { ...reject, reasonRequired: true }] }),
      call: { action: 'reject', reason: 'Amount exceeds policy' },
      effect: 'reject',
    },
    {
      name: 'a rerun with a comment',
      call: { action: 're-request', comment: 'Use the discounted price' },
      effect: 'rerun-source',
    },
  ])('accepts $name', ({ contract = contractWith(), call, effect }) => {
    const result = validateSubmittedDecision(contract, call);

    expect(result.error).toBeUndefined();
    expect(result.decision?.effect).toBe(effect);
    expect(result.decision?.action.name).toBe(call.action);
  });

  it.each<{
    name: string;
    contract?: DecisionContract;
    call: SubmittedDecision;
    code: SubmittedDecisionErrorCode;
    value: string;
    path: string[];
  }>([
    {
      name: 'an action the contract does not offer',
      call: { action: 'escalate' },
      code: 'unknown_action',
      value: 'escalate',
      path: ['action'],
    },
    {
      name: 'a reject on a contract without a reject action',
      contract: contractWith({ actions: [approve] }),
      call: { action: 'reject', reason: 'no' },
      code: 'unknown_action',
      value: 'reject',
      path: ['action'],
    },
    {
      name: 'a rerun on a contract without a rerun-source action',
      contract: contractWith({ actions: [approve, reject] }),
      call: { action: 're-request', comment: 'again' },
      code: 'unknown_action',
      value: 're-request',
      path: ['action'],
    },
    {
      name: 'a reject without a reason when one is required',
      contract: contractWith({ actions: [approve, { ...reject, reasonRequired: true }] }),
      call: { action: 'reject' },
      code: 'reason_required',
      value: 'reject',
      path: ['reason'],
    },
    {
      name: 'a reject with a blank reason when one is required',
      contract: contractWith({ actions: [approve, { ...reject, reasonRequired: true }] }),
      call: { action: 'reject', reason: '   ' },
      code: 'reason_required',
      value: 'reject',
      path: ['reason'],
    },
    {
      name: 'a rerun without a comment',
      call: { action: 're-request' },
      code: 'comment_required',
      value: 're-request',
      path: ['comment'],
    },
    {
      name: 'a rerun with a whitespace-only comment',
      call: { action: 're-request', comment: ' \n ' },
      code: 'comment_required',
      value: 're-request',
      path: ['comment'],
    },
    {
      name: 'an edit on a read-only field',
      call: { action: 'approve', edits: { orderDate: '2026-01-01' } },
      code: 'field_not_editable',
      value: 'orderDate',
      path: ['edits', 'orderDate'],
    },
    {
      name: 'an edit on a field the schema does not declare',
      call: { action: 'approve', edits: { discount: 10 } },
      code: 'unknown_field',
      value: 'discount',
      path: ['edits', 'discount'],
    },
    {
      name: 'an edit on a field that exists only on Object.prototype',
      call: { action: 'approve', edits: { constructor: 1 } },
      code: 'unknown_field',
      value: 'constructor',
      path: ['edits', 'constructor'],
    },
    {
      name: 'a required field emptied with an empty string',
      call: { action: 'approve', edits: { refundAmount: '' } },
      code: 'required_field_missing',
      value: 'refundAmount',
      path: ['edits', 'refundAmount'],
    },
    {
      name: 'a required field emptied with null',
      call: { action: 'approve', edits: { refundAmount: null } },
      code: 'required_field_missing',
      value: 'refundAmount',
      path: ['edits', 'refundAmount'],
    },
    {
      name: 'a required field emptied with undefined',
      call: { action: 'approve', edits: { refundAmount: undefined } },
      code: 'required_field_missing',
      value: 'refundAmount',
      path: ['edits', 'refundAmount'],
    },
  ])('refuses $name', ({ contract = contractWith(), call, code, value, path }) => {
    expect(validateSubmittedDecision(contract, call)).toEqual({
      error: { code, message: submittedDecisionErrorMessage(code, value), path },
    });
  });

  it('builds the decision from the matched action and what was submitted', () => {
    const submitted = { action: 'approve', edits: { refundAmount: 12 }, comment: 'rounded down' };

    expect(validateSubmittedDecision(contractWith(), submitted).decision).toEqual({
      action: approve,
      effect: 'resume-with-edits',
      edits: { refundAmount: 12 },
      comment: 'rounded down',
    });
  });

  it('defaults edits to an empty object when none were submitted', () => {
    expect(validateSubmittedDecision(contractWith(), { action: 'reject', reason: 'late' }).decision).toEqual({
      action: reject,
      effect: 'reject',
      edits: {},
      reason: 'late',
    });
  });
});

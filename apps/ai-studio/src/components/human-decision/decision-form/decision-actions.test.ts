import { describe, expect, it } from 'vitest';

import { offeredActions } from './decision-actions';
import { reviewRequest } from './review-request.fixture';

const [approve, reject] = reviewRequest.actions;

describe('offeredActions', () => {
  it('offers the resume and the reject the request declares', () => {
    expect(offeredActions(reviewRequest.actions)).toEqual({
      resume: { name: 'approve', label: 'Approve' },
      reject: { name: 'reject', label: 'Reject', reasonRequired: false },
    });
  });

  it('carries reasonRequired from the reject action', () => {
    expect(offeredActions([approve, { ...reject, reasonRequired: true }])?.reject?.reasonRequired).toBe(true);
  });

  it('offers no reject when the request declares none', () => {
    expect(offeredActions([approve])?.reject).toBeUndefined();
  });

  it('leaves out a rerun-source action, which the endpoint refuses with 501', () => {
    const actions = [approve, { name: 'redraft', label: 'Ask again', effect: 'rerun-source' }];

    expect(offeredActions(actions)).toEqual({ resume: { name: 'approve', label: 'Approve' }, reject: undefined });
  });

  it('falls back to the action name when the label is blank', () => {
    expect(offeredActions([{ ...approve, label: '  ' }])?.resume.label).toBe('approve');
  });

  it('offers nothing without a usable resume action, whatever else the request carries', () => {
    expect(offeredActions([reject])).toBeUndefined();
    expect(offeredActions([null, { name: '', effect: 'resume' }])).toBeUndefined();
  });
});

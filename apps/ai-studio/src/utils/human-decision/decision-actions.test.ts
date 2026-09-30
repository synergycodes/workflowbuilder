import { describe, expect, it } from 'vitest';

import { offeredActions, rejectPortOf, withReasonRequired, withReject } from './decision-actions';
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

  it('finds the resume and the reject wherever the request lists them', () => {
    const rerun = { name: 'redraft', label: 'Ask again', effect: 'rerun-source' };

    expect(offeredActions([rerun, reject, approve])).toEqual(offeredActions([approve, reject]));
  });

  it('falls back to the action name when the label is blank', () => {
    expect(offeredActions([{ ...approve, label: '  ' }])?.resume.label).toBe('approve');
  });

  it('offers no reject when the reject has no port to route on', () => {
    const portless = { name: 'reject', label: 'Reject', effect: 'reject', reasonRequired: false };

    expect(offeredActions([approve, portless])?.reject).toBeUndefined();
    expect(offeredActions([approve, { ...reject, port: ' ' }])?.reject).toBeUndefined();
  });

  it('offers nothing without a usable resume action, whatever else the request carries', () => {
    expect(offeredActions([reject])).toBeUndefined();
    expect(offeredActions([null, { name: '', effect: 'resume' }])).toBeUndefined();
  });
});

describe('the reject switches', () => {
  const rerun = { name: 'redraft', label: 'Ask again', effect: 'rerun-source' };
  const added = {
    name: 'reject',
    label: 'Reject',
    effect: 'reject',
    port: 'source:inner:rejected',
    reasonRequired: true,
  };

  it('reads the port the reject routes on, and none without a reject', () => {
    expect(rejectPortOf(reviewRequest.actions)).toBe('source:inner:rejected');
    expect(rejectPortOf([approve])).toBeUndefined();
    expect(rejectPortOf([approve, { ...reject, port: '' }])).toBeUndefined();
  });

  it('turned off, drops the reject and keeps every other action in its place', () => {
    expect(withReject([rerun, reject, approve], false, added)).toEqual([rerun, approve]);
  });

  it('turned on, appends the given reject', () => {
    expect(withReject([approve], true, added)).toEqual([approve, added]);
  });

  it('turned on over a stored reject listed first, drops it and appends the given one', () => {
    expect(withReject([reject, approve], true, added)).toEqual([approve, added]);
  });

  it('turned on over a stored reject the decider is not offered, drops it and appends the given one', () => {
    const unnamed = { effect: 'reject', port: 'source:inner:rejected', reasonRequired: false };

    expect(offeredActions([approve, unnamed])?.reject).toBeUndefined();
    expect(withReject([approve, unnamed], true, added)).toEqual([approve, added]);
  });

  it('sets reasonRequired on the reject alone, and leaves a request without one as it was', () => {
    expect(withReasonRequired(reviewRequest.actions, true)).toEqual([approve, { ...reject, reasonRequired: true }]);
    expect(withReasonRequired([approve], true)).toEqual([approve]);
  });
});

import { describe, expect, it } from 'vitest';

import { readDecisionOutcome } from './decision-outcome';

describe('readDecisionOutcome', () => {
  it('reads the edits and the reason of a recorded decision', () => {
    expect(
      readDecisionOutcome({
        action: 'reject',
        effect: 'reject',
        edits: {},
        reason: 'Outside the policy',
        resolvedBy: 'human',
      }),
    ).toEqual({ edits: {}, reason: 'Outside the policy', comment: undefined });
  });

  it('reads the comment a decision was sent with', () => {
    expect(readDecisionOutcome({ action: 'escalate', effect: 'resume', comment: 'Needs a senior look' })).toEqual({
      edits: {},
      reason: undefined,
      comment: 'Needs a senior look',
    });
  });

  it('treats a blank reason or comment as none and missing edits as empty', () => {
    expect(readDecisionOutcome({ action: 'approve', reason: '  ', comment: ' ' })).toEqual({
      edits: {},
      reason: undefined,
      comment: undefined,
    });
  });

  it.each([
    ['undefined', undefined],
    ['a string', 'approve'],
    ['an object without an action', { effect: 'resume' }],
  ])('reads nothing from %s', (_name, output) => {
    expect(readDecisionOutcome(output)).toBeUndefined();
  });
});

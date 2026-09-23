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
    ).toEqual({ edits: {}, reason: 'Outside the policy' });
  });

  it('treats a blank reason as none and missing edits as empty', () => {
    expect(readDecisionOutcome({ action: 'approve', reason: '  ' })).toEqual({ edits: {}, reason: undefined });
  });

  it.each([
    ['undefined', undefined],
    ['a string', 'approve'],
    ['an object without an action', { effect: 'resume' }],
  ])('reads nothing from %s', (_name, output) => {
    expect(readDecisionOutcome(output)).toBeUndefined();
  });
});

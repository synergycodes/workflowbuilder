import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Decision } from '@workflow-builder/types/workflow-execution/decision-request';

import { type RoutedDecision, type RoutedDecisionAction, hasNodeResolution, toNodeResolution } from './node-resolution';

const approve = { name: 'approve', label: 'Approve', effect: 'resume', port: 'approved' } as const;
const reject = { name: 'reject', label: 'Reject', effect: 'reject', port: 'rejected', reasonRequired: false } as const;

describe('toNodeResolution', () => {
  it.each<{ decision: RoutedDecision; action: RoutedDecisionAction; port: string }>([
    {
      decision: { action: 'approve', effect: 'resume', edits: {}, resolvedBy: 'human' },
      action: approve,
      port: 'approved',
    },
    {
      decision: { action: 'approve', effect: 'resume-with-edits', edits: { refundAmount: 120 }, resolvedBy: 'human' },
      action: approve,
      port: 'approved',
    },
  ])('routes a $decision.effect decision on the action port and declares no outcome', ({ decision, action, port }) => {
    const completion = toNodeResolution(decision, action);

    expect(completion.nextPort).toBe(port);
    expect(completion.output).toBe(decision);
    expect(Object.keys(completion)).toEqual(['output', 'nextPort']);
  });

  it('routes a reject on its port and declares the rejection as the run outcome', () => {
    const decision: RoutedDecision = {
      action: 'reject',
      effect: 'reject',
      edits: {},
      reason: 'late',
      resolvedBy: 'human',
    };

    const completion = toNodeResolution(decision, reject);

    expect(Object.keys(completion)).toEqual(['output', 'nextPort', 'outcome']);
    expect(completion.output).toBe(decision);
    expect(completion.nextPort).toBe('rejected');
    expect(completion.outcome).toEqual({ value: 'rejected', resolvedBy: 'human' });
  });

  it("copies the decision's initiator onto the outcome, whatever it is", () => {
    const completion = toNodeResolution(
      { action: 'reject', effect: 'reject', edits: {}, resolvedBy: 'policy' },
      reject,
    );

    expect(completion.outcome?.resolvedBy).toBe('policy');
  });

  it('hands the decision over as it is, with no key added or removed', () => {
    const decision: RoutedDecision = {
      action: 'approve',
      effect: 'resume-with-edits',
      edits: { refundAmount: 120 },
      resolvedBy: 'human',
    };
    const before = structuredClone(decision);

    const completion = toNodeResolution(decision, approve);

    expect(completion.output).toBe(decision);
    expect(decision).toEqual(before);
  });

  it('routes a reject on its port even when no reason was given', () => {
    const decision: RoutedDecision = { action: 'reject', effect: 'reject', edits: {}, resolvedBy: 'human' };

    const completion = toNodeResolution(decision, reject);

    expect(completion).toEqual({
      output: decision,
      nextPort: 'rejected',
      outcome: { value: 'rejected', resolvedBy: 'human' },
    });
  });

  it('refuses the reserved errorRoute port, which the request parser already forbids', () => {
    const decision: RoutedDecision = { action: 'approve', effect: 'resume', edits: {}, resolvedBy: 'human' };

    expect(() => toNodeResolution(decision, { ...approve, port: 'errorRoute' })).toThrow("reserved 'errorRoute'");
  });

  it('has no completion for a rerun-source decision', () => {
    expect(
      hasNodeResolution({
        action: 'ask-again',
        effect: 'rerun-source',
        edits: {},
        comment: 'again',
        resolvedBy: 'human',
      }),
    ).toBe(false);
    expect(hasNodeResolution({ action: 'approve', effect: 'resume', edits: {}, resolvedBy: 'human' })).toBe(true);
    expectTypeOf<RoutedDecision['effect']>().toEqualTypeOf<'resume' | 'resume-with-edits' | 'reject'>();
    expectTypeOf<Extract<RoutedDecisionAction, { effect: 'rerun-source' }>>().toEqualTypeOf<never>();
    expectTypeOf<RoutedDecision>().toMatchTypeOf<Decision>();
  });
});

import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Decision } from '@workflow-builder/types/workflow-execution/decision-request';

import { type RoutedDecision, type RoutedDecisionAction, toNodeResolution } from './node-resolution';

const approve = { name: 'approve', label: 'Approve', effect: 'resume', port: 'approved' } as const;
const reject = { name: 'reject', label: 'Reject', effect: 'reject', port: 'rejected', reasonRequired: false } as const;

describe('toNodeResolution', () => {
  it.each<{ decision: RoutedDecision; action: RoutedDecisionAction; port: string }>([
    { decision: { action: 'approve', effect: 'resume', edits: {} }, action: approve, port: 'approved' },
    {
      decision: { action: 'approve', effect: 'resume-with-edits', edits: { refundAmount: 120 } },
      action: approve,
      port: 'approved',
    },
    { decision: { action: 'reject', effect: 'reject', edits: {}, reason: 'late' }, action: reject, port: 'rejected' },
  ])('routes a $decision.effect decision on the action port', ({ decision, action, port }) => {
    const completion = toNodeResolution(decision, action);

    expect(completion.nextPort).toBe(port);
    expect(completion.output).toBe(decision);
    expect(Object.keys(completion)).toEqual(['output', 'nextPort']);
  });

  it('hands the decision over as it is, with no key added or removed', () => {
    const decision: RoutedDecision = { action: 'approve', effect: 'resume-with-edits', edits: { refundAmount: 120 } };
    const before = structuredClone(decision);

    const completion = toNodeResolution(decision, approve);

    expect(completion.output).toBe(decision);
    expect(decision).toEqual(before);
  });

  it('routes a reject on its port even when no reason was given', () => {
    const completion = toNodeResolution({ action: 'reject', effect: 'reject', edits: {} }, reject);

    expect(completion).toEqual({ output: { action: 'reject', effect: 'reject', edits: {} }, nextPort: 'rejected' });
  });

  it('refuses the reserved errorRoute port, which the request parser already forbids', () => {
    const decision: RoutedDecision = { action: 'approve', effect: 'resume', edits: {} };

    expect(() => toNodeResolution(decision, { ...approve, port: 'errorRoute' })).toThrow("reserved 'errorRoute'");
  });

  it('has no completion for a rerun-source decision', () => {
    expectTypeOf<RoutedDecision['effect']>().toEqualTypeOf<'resume' | 'resume-with-edits' | 'reject'>();
    expectTypeOf<Extract<RoutedDecisionAction, { effect: 'rerun-source' }>>().toEqualTypeOf<never>();
    expectTypeOf<RoutedDecision>().toMatchTypeOf<Decision>();
  });
});

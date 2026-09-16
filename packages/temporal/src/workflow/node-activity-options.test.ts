import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DATABASE_ACTIVITY_PROFILE,
  DEFAULT_NODE_ACTIVITY_PROFILE,
  type NodeActivityProfiles,
} from './activity-profiles';
import type { BaseNode } from './core-contract';
import { resolveFromValidatedProfiles, resolveNodeActivityOptions } from './node-activity-options';

function node(overrides: Partial<BaseNode> = {}): BaseNode {
  return { id: 'n1', type: 'test/step', config: {}, ...overrides };
}

const encoder = new TextEncoder();

function byteLength(text: string | undefined): number {
  return encoder.encode(text).length;
}

// A lone surrogate encodes to U+FFFD, so a split pair fails the round trip. Stands in
// for `isWellFormed`, which is ES2024 and outside this package's `lib`.
function survivesUtf8(text: string | undefined): boolean {
  return new TextDecoder().decode(encoder.encode(text)) === text;
}

describe('the shared default profiles', () => {
  it('refuses an in-place tune at compile time, not only at runtime', () => {
    // Annotated `ActivityProfile`, the freeze was invisible to TypeScript: tuning a
    // default compiled clean and threw on first activation inside the sandbox.
    expect(() => {
      // @ts-expect-error readonly, which is the point of this test
      DEFAULT_NODE_ACTIVITY_PROFILE.retry.maximumAttempts = 3;
    }).toThrow(TypeError);
    expect(() => {
      // @ts-expect-error readonly, which is the point of this test
      DEFAULT_NODE_ACTIVITY_PROFILE.startToCloseTimeout = '5m';
    }).toThrow(TypeError);
    expect(() => {
      // @ts-expect-error readonly, which is the point of this test
      DEFAULT_DATABASE_ACTIVITY_PROFILE.retry.maximumAttempts = 3;
    }).toThrow(TypeError);

    expect(DEFAULT_NODE_ACTIVITY_PROFILE).toEqual({ startToCloseTimeout: '10m', retry: { maximumAttempts: 2 } });
    expect(DEFAULT_DATABASE_ACTIVITY_PROFILE).toEqual({ startToCloseTimeout: '30s', retry: { maximumAttempts: 5 } });
  });
});

describe('resolveNodeActivityOptions', () => {
  describe('timeouts and retries', () => {
    // Temporal's own default is unlimited retries with backoff, so a resolution bug
    // does not fail loudly, it spends.
    it('falls back to the blanket profile for a type with no entry', () => {
      const resolved = resolveNodeActivityOptions(node({ type: 'test/unprofiled' }), {});

      expect(resolved).toEqual({ startToCloseTimeout: '10m', retry: { maximumAttempts: 2 } });
      expect(resolved).toEqual(DEFAULT_NODE_ACTIVITY_PROFILE);
    });

    it('falls back per type, so one profiled type does not change another', () => {
      const profiles: NodeActivityProfiles = {
        'test/slow': { startToCloseTimeout: '45m', retry: { maximumAttempts: 1 } },
      };

      expect(resolveNodeActivityOptions(node({ type: 'test/slow' }), profiles)).toEqual({
        startToCloseTimeout: '45m',
        retry: { maximumAttempts: 1 },
      });
      expect(resolveNodeActivityOptions(node({ type: 'test/other' }), profiles)).toEqual(DEFAULT_NODE_ACTIVITY_PROFILE);
    });

    it('never returns the shared default object, so a caller cannot mutate it', () => {
      const resolved = resolveNodeActivityOptions(node(), {});

      expect(resolved).not.toBe(DEFAULT_NODE_ACTIVITY_PROFILE);
      // A shallow spread shared this one, so a mutation changed every node's cap.
      expect(resolved.retry).not.toBe(DEFAULT_NODE_ACTIVITY_PROFILE.retry);

      resolved.retry.maximumAttempts = 999;
      expect(DEFAULT_NODE_ACTIVITY_PROFILE.retry.maximumAttempts).toBe(2);
    });

    it('does not alias a caller-supplied profile either', () => {
      const profiles: NodeActivityProfiles = {
        'test/step': { startToCloseTimeout: '2m', retry: { maximumAttempts: 4 } },
      };

      const resolved = resolveNodeActivityOptions(node(), profiles);
      resolved.retry.maximumAttempts = 999;

      expect(profiles['test/step']!.retry.maximumAttempts).toBe(4);
    });

    it('ignores an inherited key rather than treating it as a profile', () => {
      const resolved = resolveNodeActivityOptions(node({ type: 'constructor' }), {});

      expect(resolved).toEqual(DEFAULT_NODE_ACTIVITY_PROFILE);
    });

    it('forwards only the two validated fields, never the rest of a caller\u2019s entry', () => {
      // Whatever reaches proxyActivities is unvalidated by definition, and a throw from
      // there lands inside executeNode where errorPolicy can absorb it.
      const wider = {
        'test/step': {
          startToCloseTimeout: '2m',
          retry: { maximumAttempts: 4, initialInterval: '0s' },
          scheduleToCloseTimeout: 'nonsense',
        },
      } as unknown as NodeActivityProfiles;

      expect(resolveFromValidatedProfiles(node(), wider)).toEqual({
        startToCloseTimeout: '2m',
        retry: { maximumAttempts: 4 },
      });
    });

    it('validates the whole map, so a bad entry names itself', () => {
      // The README points consumers here to check their own map, so the export cannot
      // assume the snapshot createRunWorkflow builds. It runs the same map-wide assert
      // a worker runs, which is what keeps the two messages from drifting apart.
      const undefinedEntry = { 'test/step': undefined } as unknown as NodeActivityProfiles;
      const badTimeout = { 'test/other': { startToCloseTimeout: '0s', retry: { maximumAttempts: 2 } } };

      expect(() => resolveNodeActivityOptions(node(), undefinedEntry)).toThrow(/nodeActivityProfiles\["test\/step"\]/);
      // Reported even though this node would never have read that entry.
      expect(() => resolveNodeActivityOptions(node(), badTimeout as unknown as NodeActivityProfiles)).toThrow(
        /nodeActivityProfiles\["test\/other"\]\.startToCloseTimeout/,
      );
    });
  });

  describe('summary', () => {
    it('carries the node label so Event History reads like the diagram', () => {
      const resolved = resolveNodeActivityOptions(node({ label: 'Fetch order' }), {});

      expect(resolved.summary).toBe('Fetch order');
    });

    it('omits the key entirely for an unlabelled node', () => {
      // Not `summary: undefined`: that is a different command payload.
      const resolved = resolveNodeActivityOptions(node(), {});

      expect('summary' in resolved).toBe(false);
    });

    it('trims the label and drops a blank one', () => {
      // Not only in the reference backend: any consumer can build the workflow input.
      expect(resolveNodeActivityOptions(node({ label: '  Approve  ' }), {}).summary).toBe('Approve');
      expect('summary' in resolveNodeActivityOptions(node({ label: '   ' }), {})).toBe(false);
      expect('summary' in resolveNodeActivityOptions(node({ label: '' }), {})).toBe(false);
    });

    it('clamps a long label, since the Summary is copied into every scheduled event', () => {
      const long = resolveNodeActivityOptions(node({ label: 'x'.repeat(2000) }), {});
      const short = resolveNodeActivityOptions(node({ label: 'y'.repeat(120) }), {});

      expect(byteLength(long.summary)).toBeLessThanOrEqual(300);
      expect(long.summary).toBe('x'.repeat(long.summary!.length));
      expect(short.summary).toBe('y'.repeat(120));
    });

    it('clamps by bytes, not code units, so a CJK label stays in budget', () => {
      // 300 characters of CJK is 900 bytes, which a character clamp let through.
      const resolved = resolveNodeActivityOptions(node({ label: '漢'.repeat(300) }), {});

      expect(byteLength(resolved.summary)).toBeLessThanOrEqual(300);
      // Still fills the budget rather than truncating to almost nothing.
      expect(byteLength(resolved.summary)).toBeGreaterThan(250);
    });

    it('never cuts a surrogate pair in half', () => {
      // The clamp lands mid-emoji here, which a UTF-16 slice turns into U+FFFD.
      const resolved = resolveNodeActivityOptions(node({ label: `a${'😀'.repeat(150)}` }), {});

      expect(survivesUtf8(resolved.summary)).toBe(true);
      expect(byteLength(resolved.summary)).toBeLessThanOrEqual(300);
    });

    it('collapses a multi-line label, which Temporal renders as single-line markdown', () => {
      const resolved = resolveNodeActivityOptions(node({ label: 'Approve\n  the\torder ' }), {});

      expect(resolved.summary).toBe('Approve the order');
    });

    it('never leaves whitespace at either end, wherever the clamp lands', () => {
      // Varying word lengths so the cut falls on a space for at least one of them.
      for (const word of ['a', 'ab', 'abc', 'abcd', 'abcde']) {
        const resolved = resolveNodeActivityOptions(node({ label: `${word} `.repeat(400) }), {});

        expect(resolved.summary).not.toMatch(/^\s|\s$/);
      }
    });

    it('ignores a label that is not a string', () => {
      const untyped = node({ label: 42 as unknown as string });

      expect('summary' in resolveNodeActivityOptions(untyped, {})).toBe(false);
    });

    it('keeps the label alongside a per-type profile', () => {
      const profiles: NodeActivityProfiles = {
        'test/step': { startToCloseTimeout: '2m', retry: { maximumAttempts: 4 } },
      };

      expect(resolveNodeActivityOptions(node({ label: 'Approve' }), profiles)).toEqual({
        startToCloseTimeout: '2m',
        retry: { maximumAttempts: 4 },
        summary: 'Approve',
      });
    });
  });
});

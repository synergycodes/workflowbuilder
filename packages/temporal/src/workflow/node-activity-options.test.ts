import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DATABASE_ACTIVITY_PROFILE,
  DEFAULT_NODE_ACTIVITY_PROFILE,
  type NodeActivityProfiles,
} from './activity-profiles';
import type { BaseNode } from './core-contract';
import {
  assertNodeActivityProfiles,
  freezeNodeActivityProfiles,
  resolveNodeActivityOptions,
} from './node-activity-options';

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

describe('freezeNodeActivityProfiles', () => {
  it('validates once, at the boundary', () => {
    const broken = { 'test/step': { startToCloseTimeout: '0s', retry: { maximumAttempts: 2 } } };

    expect(() => freezeNodeActivityProfiles(broken as unknown as NodeActivityProfiles)).toThrow(TypeError);
    expect(() => freezeNodeActivityProfiles({})).not.toThrow();
  });

  it('ignores an entry added to the caller’s map afterwards', () => {
    // Scheduling-time validation is not an option: a throw inside executeNode reaches
    // the graph's errorPolicy, and 'continue' absorbs it into a completed run.
    const live: Record<string, unknown> = {};
    const snapshot = freezeNodeActivityProfiles(live as NodeActivityProfiles);

    live['test/step'] = { startToCloseTimeout: 'not a duration', retry: { maximumAttempts: 0 } };

    expect(resolveNodeActivityOptions(node(), snapshot)).toEqual(DEFAULT_NODE_ACTIVITY_PROFILE);
  });

  it('ignores a field edited on the caller’s profile afterwards', () => {
    const live = { 'test/step': { startToCloseTimeout: '2m', retry: { maximumAttempts: 4 } } };
    const snapshot = freezeNodeActivityProfiles(live as NodeActivityProfiles);

    live['test/step'].retry.maximumAttempts = 999;

    expect(resolveNodeActivityOptions(node(), snapshot)).toEqual({
      startToCloseTimeout: '2m',
      retry: { maximumAttempts: 4 },
    });
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

      expect(byteLength(long.summary)).toBeLessThanOrEqual(400);
      expect(long.summary).toBe('x'.repeat(long.summary!.length));
      expect(short.summary).toBe('y'.repeat(120));
    });

    it('clamps by bytes, not code units, so a CJK label stays under the server cap', () => {
      // 200 characters of CJK is 600 bytes, which the character clamp let through.
      const resolved = resolveNodeActivityOptions(node({ label: '漢'.repeat(300) }), {});

      expect(byteLength(resolved.summary)).toBeLessThanOrEqual(400);
      // Still fills the budget rather than truncating to almost nothing.
      expect(byteLength(resolved.summary)).toBeGreaterThan(300);
    });

    it('never cuts a surrogate pair in half', () => {
      // The clamp lands mid-emoji here, which a UTF-16 slice turns into U+FFFD.
      const resolved = resolveNodeActivityOptions(node({ label: `a${'😀'.repeat(150)}` }), {});

      expect(survivesUtf8(resolved.summary)).toBe(true);
      expect(byteLength(resolved.summary)).toBeLessThanOrEqual(400);
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

describe('assertNodeActivityProfiles', () => {
  // Left to scheduling time, a throw lands inside the node activity, where the graph's
  // errorPolicy can absorb it into a completed run.
  it('accepts an empty map and a well-formed profile', () => {
    expect(() => assertNodeActivityProfiles({})).not.toThrow();
    expect(() =>
      assertNodeActivityProfiles({ 'test/step': { startToCloseTimeout: '90s', retry: { maximumAttempts: 3 } } }),
    ).not.toThrow();
  });

  it('rejects a duration Temporal would not parse, naming the config path', () => {
    // Temporal's own validator only asks that some timeout is set.
    const profiles = { 'test/step': { startToCloseTimeout: '30 minutes', retry: { maximumAttempts: 2 } } };

    expect(() => assertNodeActivityProfiles(profiles as unknown as NodeActivityProfiles)).toThrow(
      /nodeActivityProfiles\["test\/step"\]\.startToCloseTimeout must be a positive number/,
    );
  });

  it('accepts a decimal duration, which Temporal parses and the type allows', () => {
    for (const startToCloseTimeout of ['1.5h', '0.5s', '90s', '250ms', '2d']) {
      expect(() =>
        assertNodeActivityProfiles({
          'test/step': { startToCloseTimeout, retry: { maximumAttempts: 2 } },
        } as unknown as NodeActivityProfiles),
      ).not.toThrow();
    }
  });

  it('rejects a zero duration, which the server treats as unset', () => {
    // The server refuses the command, so the workflow task retries forever.
    for (const startToCloseTimeout of ['0s', '0m', '00h', '0.0s', '0ms']) {
      expect(() =>
        assertNodeActivityProfiles({
          'test/step': { startToCloseTimeout, retry: { maximumAttempts: 2 } },
        } as unknown as NodeActivityProfiles),
      ).toThrow(/must be a positive number/);
    }
  });

  it('rejects values the template literal type admits but Temporal does not', () => {
    // `${number}` covers negatives and exponents; the runtime narrows deliberately.
    for (const startToCloseTimeout of ['-5m', '1e3s', '.5s', '5', 'm']) {
      expect(() =>
        assertNodeActivityProfiles({
          'test/step': { startToCloseTimeout, retry: { maximumAttempts: 2 } },
        } as unknown as NodeActivityProfiles),
      ).toThrow(TypeError);
    }
  });

  it('rejects an entry whose value is undefined rather than defaulting it', () => {
    const profiles = { 'test/step': undefined };

    expect(() => assertNodeActivityProfiles(profiles as unknown as NodeActivityProfiles)).toThrow(/test\/step/);
  });

  it('rejects a missing timeout', () => {
    const profiles = { 'test/step': { retry: { maximumAttempts: 2 } } };

    expect(() => assertNodeActivityProfiles(profiles as unknown as NodeActivityProfiles)).toThrow(TypeError);
  });

  it('rejects a missing or nonsensical retry cap', () => {
    const noRetry = { 'test/step': { startToCloseTimeout: '10m' } };
    const zero = { 'test/step': { startToCloseTimeout: '10m', retry: { maximumAttempts: 0 } } };
    const fractional = { 'test/step': { startToCloseTimeout: '10m', retry: { maximumAttempts: 1.5 } } };

    for (const profiles of [noRetry, zero, fractional]) {
      expect(() => assertNodeActivityProfiles(profiles as unknown as NodeActivityProfiles)).toThrow(
        /retry\.maximumAttempts must be a positive integer/,
      );
    }
  });

  it('reports the offending node type when several profiles are declared', () => {
    const profiles = {
      'test/ok': { startToCloseTimeout: '10m', retry: { maximumAttempts: 2 } },
      'test/broken': { startToCloseTimeout: '10 minutes', retry: { maximumAttempts: 2 } },
    };

    expect(() => assertNodeActivityProfiles(profiles as unknown as NodeActivityProfiles)).toThrow(/test\/broken/);
  });
});

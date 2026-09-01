import { describe, expect, it } from 'vitest';

import { DEFAULT_NODE_ACTIVITY_PROFILE, type NodeActivityProfiles } from './activity-profiles';
import type { BaseNode } from './core-contract';
import { assertNodeActivityProfiles, resolveNodeActivityOptions } from './node-activity-options';

function node(overrides: Partial<BaseNode> = {}): BaseNode {
  return { id: 'n1', type: 'test/step', config: {}, ...overrides };
}

describe('resolveNodeActivityOptions', () => {
  describe('timeouts and retries', () => {
    // The trap: Temporal's own default is unlimited retries with backoff, so a
    // resolution bug does not fail loudly, it just spends.
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
      // The nested object is the one a shallow spread would have shared. Mutating it
      // used to change the retry cap for every node for the rest of the process.
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

    it('keeps the exported defaults frozen', () => {
      expect(Object.isFrozen(DEFAULT_NODE_ACTIVITY_PROFILE)).toBe(true);
      expect(Object.isFrozen(DEFAULT_NODE_ACTIVITY_PROFILE.retry)).toBe(true);
      // The documented way to derive a profile has to keep working on a frozen source.
      expect({ ...DEFAULT_NODE_ACTIVITY_PROFILE, startToCloseTimeout: '30m' as const }).toEqual({
        startToCloseTimeout: '30m',
        retry: { maximumAttempts: 2 },
      });
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
      // Enforced here, not only in the reference backend: any consumer can build the
      // workflow input, and the package is the published unit.
      expect(resolveNodeActivityOptions(node({ label: '  Approve  ' }), {}).summary).toBe('Approve');
      expect('summary' in resolveNodeActivityOptions(node({ label: '   ' }), {})).toBe(false);
      expect('summary' in resolveNodeActivityOptions(node({ label: '' }), {})).toBe(false);
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
  // Why it exists at all: a profile checked at scheduling time throws inside the node
  // activity, where the graph's errorPolicy can absorb it and close the run as
  // completed. Exported so worker setup can run it outside the sandbox, where a throw
  // fails the deploy rather than the first activation.
  it('accepts an empty map and a well-formed profile', () => {
    expect(() => assertNodeActivityProfiles({})).not.toThrow();
    expect(() =>
      assertNodeActivityProfiles({ 'test/step': { startToCloseTimeout: '90s', retry: { maximumAttempts: 3 } } }),
    ).not.toThrow();
  });

  it('rejects a duration Temporal would not parse, naming the config path', () => {
    // Temporal's own validator only asks that some timeout is set, so this format
    // would otherwise reach the scheduling call and fail there.
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
    // The worst of the malformed values: the command is refused, so the workflow task
    // retries forever and the run sits in Running with no terminal event.
    for (const startToCloseTimeout of ['0s', '0m', '00h', '0.0s', '0ms']) {
      expect(() =>
        assertNodeActivityProfiles({
          'test/step': { startToCloseTimeout, retry: { maximumAttempts: 2 } },
        } as unknown as NodeActivityProfiles),
      ).toThrow(/must be a positive number/);
    }
  });

  it('rejects values the template literal type admits but Temporal does not', () => {
    // `${number}` covers negatives and exponents, so the runtime narrows deliberately.
    // The message and the README describe the grammar that survives.
    for (const startToCloseTimeout of ['-5m', '1e3s', '.5s', '5', 'm']) {
      expect(() =>
        assertNodeActivityProfiles({
          'test/step': { startToCloseTimeout, retry: { maximumAttempts: 2 } },
        } as unknown as NodeActivityProfiles),
      ).toThrow(TypeError);
    }
  });

  it('rejects an entry whose value is undefined rather than defaulting it', () => {
    // The resolver no longer defaults such an entry either, so a consumer testing their
    // map through either export gets the same answer.
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

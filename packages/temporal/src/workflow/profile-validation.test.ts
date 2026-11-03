import { describe, expect, it } from 'vitest';

import { DEFAULT_NODE_ACTIVITY_PROFILE, type NodeActivityProfiles } from './activity-profiles';
import type { BaseNode } from './core-contract';
import { resolveNodeActivityOptions } from './node-activity-options';
import {
  assertNodeActivityProfiles,
  findProfilesWithoutExecutor,
  freezeNodeActivityProfiles,
} from './profile-validation';

const node: BaseNode = { id: 'n1', type: 'test/step', config: {} };

function profiles(startToCloseTimeout: unknown, maximumAttempts: unknown = 2): NodeActivityProfiles {
  return { 'test/step': { startToCloseTimeout, retry: { maximumAttempts } } } as unknown as NodeActivityProfiles;
}

describe('assertNodeActivityProfiles', () => {
  // Left to scheduling time, a throw lands inside the node activity, where the graph's
  // errorPolicy can absorb it into a completed run.
  it('accepts an empty map and a well-formed profile', () => {
    expect(() => assertNodeActivityProfiles({})).not.toThrow();
    expect(() => assertNodeActivityProfiles(profiles('90s', 3))).not.toThrow();
  });

  describe('startToCloseTimeout', () => {
    it('rejects a duration Temporal would not parse, naming the config path', () => {
      // Temporal's own validator only asks that some timeout is set.
      expect(() => assertNodeActivityProfiles(profiles('30 minutes'))).toThrow(
        /nodeActivityProfiles\["test\/step"\]\.startToCloseTimeout must be a number followed by ms/,
      );
    });

    it('accepts a decimal duration, which Temporal parses and the type allows', () => {
      for (const timeout of ['1.5h', '0.5s', '90s', '250ms', '2d']) {
        expect(() => assertNodeActivityProfiles(profiles(timeout))).not.toThrow();
      }
    });

    it('rejects a zero duration, which the server treats as unset', () => {
      // The server refuses the command, so the workflow task retries forever.
      for (const timeout of ['0s', '0m', '00h', '0.0s', '0ms']) {
        expect(() => assertNodeActivityProfiles(profiles(timeout))).toThrow(/must fit a protobuf Duration/);
      }
    });

    it('rejects a duration that rounds to zero on the wire, like a literal zero', () => {
      // Temporal converts to a protobuf Duration by rounding to nanoseconds, so
      // 0.0000001ms is 0.1ns and lands on the same wedged workflow task as '0s'.
      for (const timeout of ['0.0000001ms', '0.0000009ms']) {
        expect(() => assertNodeActivityProfiles(profiles(timeout))).toThrow(/must fit a protobuf Duration/);
      }
      // One nanosecond, the smallest a Duration carries. Absurd as a timeout, but it
      // fails loudly at the activity rather than silently at the command.
      expect(() => assertNodeActivityProfiles(profiles('0.000001ms'))).not.toThrow();
      expect(() => assertNodeActivityProfiles(profiles('0.5ms'))).not.toThrow();
    });

    it('rejects a duration that overflows the protobuf Duration', () => {
      // parseFloat reaches Infinity long before the string does anything sensible.
      const overflowing = '9'.repeat(400);

      expect(() => assertNodeActivityProfiles(profiles(`${overflowing}d`))).toThrow(/must fit a protobuf Duration/);
      expect(() => assertNodeActivityProfiles(profiles('3652501d'))).toThrow(/must fit a protobuf Duration/);
      // The documented ceiling, and a long-waiting activity below it.
      expect(() => assertNodeActivityProfiles(profiles('3652500d'))).not.toThrow();
      expect(() => assertNodeActivityProfiles(profiles('365d'))).not.toThrow();
    });

    it('rejects values the template literal type admits but Temporal does not', () => {
      // `${number}` covers negatives and exponents; the runtime narrows deliberately.
      for (const timeout of ['-5m', '1e3s', '.5s', '5', 'm']) {
        expect(() => assertNodeActivityProfiles(profiles(timeout))).toThrow(TypeError);
      }
    });

    it('rejects a missing timeout', () => {
      const missing = { 'test/step': { retry: { maximumAttempts: 2 } } };

      expect(() => assertNodeActivityProfiles(missing as unknown as NodeActivityProfiles)).toThrow(TypeError);
    });
  });

  describe('retry.maximumAttempts', () => {
    it('rejects a missing or nonsensical cap', () => {
      const noRetry = { 'test/step': { startToCloseTimeout: '10m' } };

      for (const map of [noRetry as unknown as NodeActivityProfiles, profiles('10m', 0), profiles('10m', 1.5)]) {
        expect(() => assertNodeActivityProfiles(map)).toThrow(/retry\.maximumAttempts must be a positive integer/);
      }
    });

    it('rejects a cap the int32 proto field cannot hold', () => {
      // 2147483648 arrives as -2147483648, and 4294967296 as 0, which Temporal reads
      // as unlimited retries: the cap silently becomes its own opposite.
      expect(() => assertNodeActivityProfiles(profiles('10m', 2_147_483_647))).not.toThrow();
      expect(() => assertNodeActivityProfiles(profiles('10m', 2_147_483_648))).toThrow(
        /no greater than 2147483647, got 2147483648/,
      );
    });
  });

  describe('unknown keys', () => {
    // The resolver forwards only the two validated fields, so anything else would be
    // dropped in silence. A map built from configuration gets no excess-property check
    // from TypeScript either, which is how one arrives here in the first place.
    it('rejects a key the profile does not carry, naming it', () => {
      const extra = {
        'test/step': { startToCloseTimeout: '10m', retry: { maximumAttempts: 2 }, scheduleToCloseTimeout: '1h' },
      };

      expect(() => assertNodeActivityProfiles(extra as unknown as NodeActivityProfiles)).toThrow(
        /nodeActivityProfiles\["test\/step"\] has unknown key "scheduleToCloseTimeout"/,
      );
    });

    it('rejects a key nested under retry, naming the path', () => {
      const extra = {
        'test/step': { startToCloseTimeout: '10m', retry: { maximumAttempts: 2, initialInterval: '0s' } },
      };

      expect(() => assertNodeActivityProfiles(extra as unknown as NodeActivityProfiles)).toThrow(
        /nodeActivityProfiles\["test\/step"\]\.retry has unknown key "initialInterval"/,
      );
    });

    it('names every unknown key at once rather than one per run', () => {
      const extra = {
        'test/step': {
          startToCloseTimeout: '10m',
          retry: { maximumAttempts: 2 },
          taskQueue: 'x',
          heartbeatTimeout: '1m',
        },
      };

      expect(() => assertNodeActivityProfiles(extra as unknown as NodeActivityProfiles)).toThrow(
        /has unknown keys "taskQueue", "heartbeatTimeout"/,
      );
    });
  });

  it('rejects an entry whose value is undefined rather than defaulting it', () => {
    const undefinedEntry = { 'test/step': undefined };

    expect(() => assertNodeActivityProfiles(undefinedEntry as unknown as NodeActivityProfiles)).toThrow(/test\/step/);
  });

  it('reports the offending node type when several profiles are declared', () => {
    const several = {
      'test/ok': { startToCloseTimeout: '10m', retry: { maximumAttempts: 2 } },
      'test/broken': { startToCloseTimeout: '10 minutes', retry: { maximumAttempts: 2 } },
    };

    expect(() => assertNodeActivityProfiles(several as unknown as NodeActivityProfiles)).toThrow(/test\/broken/);
  });
});

describe('freezeNodeActivityProfiles', () => {
  it('validates once, at the boundary', () => {
    expect(() => freezeNodeActivityProfiles(profiles('0s'))).toThrow(TypeError);
    expect(() => freezeNodeActivityProfiles({})).not.toThrow();
  });

  it('ignores an entry added to the caller’s map afterwards', () => {
    // Scheduling-time validation is not an option: a throw inside executeNode reaches
    // the graph's errorPolicy, and 'continue' absorbs it into a completed run.
    const live: Record<string, unknown> = {};
    const snapshot = freezeNodeActivityProfiles(live as NodeActivityProfiles);

    live['test/step'] = { startToCloseTimeout: 'not a duration', retry: { maximumAttempts: 0 } };

    expect(resolveNodeActivityOptions(node, snapshot)).toEqual(DEFAULT_NODE_ACTIVITY_PROFILE);
  });

  it('ignores a field edited on the caller’s profile afterwards', () => {
    const live = { 'test/step': { startToCloseTimeout: '2m', retry: { maximumAttempts: 4 } } };
    const snapshot = freezeNodeActivityProfiles(live as NodeActivityProfiles);

    live['test/step'].retry.maximumAttempts = 999;

    expect(resolveNodeActivityOptions(node, snapshot)).toEqual({
      startToCloseTimeout: '2m',
      retry: { maximumAttempts: 4 },
    });
  });
});

describe('findProfilesWithoutExecutor', () => {
  const executors = { 'test/step': () => ({ output: null }) };

  it('names every key the worker has no executor for', () => {
    const map = {
      'test/step': { startToCloseTimeout: '10m', retry: { maximumAttempts: 2 } },
      'test/typo': { startToCloseTimeout: '10m', retry: { maximumAttempts: 2 } },
    } as unknown as NodeActivityProfiles;

    expect(findProfilesWithoutExecutor(map, executors)).toEqual(['test/typo']);
  });

  it('does not treat an inherited key as a registered executor', () => {
    const map = profiles('10m');
    const inherited = { ...map, constructor: map['test/step']! } as unknown as NodeActivityProfiles;

    expect(findProfilesWithoutExecutor(inherited, executors)).toEqual(['constructor']);
  });
});

import { describe, expect, it } from 'vitest';

import { DEFAULT_NODE_ACTIVITY_PROFILE, type NodeActivityProfiles } from './activity-profiles';
import type { BaseNode } from './core-contract';
import { resolveNodeActivityOptions } from './node-activity-options';

function node(overrides: Partial<BaseNode> = {}): BaseNode {
  return { id: 'n1', type: 'test/step', config: {}, ...overrides };
}

describe('resolveNodeActivityOptions', () => {
  describe('timeouts and retries', () => {
    // The trap this whole file exists to catch. Temporal's own default is unlimited
    // retries with backoff, so a resolution bug does not fail loudly — it quietly
    // turns a permanently failing LLM node into an unbounded spend.
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
    });

    it('ignores an inherited key rather than treating it as a profile', () => {
      // `profiles` is a plain record, so a node type of 'toString' or 'constructor'
      // would otherwise resolve to something off Object.prototype and be handed to
      // Temporal as activity options.
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
      // Not `summary: undefined`: that is a different command payload, and Temporal
      // shows the activity type when no summary is set at all.
      const resolved = resolveNodeActivityOptions(node(), {});

      expect('summary' in resolved).toBe(false);
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

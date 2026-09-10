import type { Client } from '@temporalio/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TemporalWorkflowEngine } from '../src/client/index';
import { RESOLVE_NODE_UPDATE_NAME } from '../src/constants';

const NOW = Date.parse('2026-09-10T12:00:00Z');

// Just enough of a Client for resolveNode: the deadline wrapper and the handle's update call.
function fakeClient() {
  const executeUpdate = vi.fn(async () => {});
  const withDeadline = vi.fn(async (_deadline: number, run: () => Promise<unknown>) => run());
  const client = { withDeadline, workflow: { getHandle: () => ({ executeUpdate }) } } as unknown as Client;
  return { client, executeUpdate, withDeadline };
}

describe('TemporalWorkflowEngine.resolveNode deadline', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('bounds the update RPC by 10 s when resolveTimeoutMs is not given', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const { client, withDeadline, executeUpdate } = fakeClient();

    const result = await new TemporalWorkflowEngine({ client }).resolveNode('e-1', 'n-1', { output: 1 });

    expect(result).toEqual({});
    expect(withDeadline).toHaveBeenCalledWith(NOW + 10_000, expect.any(Function));
    expect(executeUpdate).toHaveBeenCalledWith(RESOLVE_NODE_UPDATE_NAME, {
      args: [{ nodeId: 'n-1', resolution: { output: 1 } }],
    });
  });

  it('bounds it by resolveTimeoutMs when given', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const { client, withDeadline } = fakeClient();

    await new TemporalWorkflowEngine({ client, resolveTimeoutMs: 250 }).resolveNode('e-1', 'n-1', { output: 1 });

    expect(withDeadline).toHaveBeenCalledWith(NOW + 250, expect.any(Function));
  });
});

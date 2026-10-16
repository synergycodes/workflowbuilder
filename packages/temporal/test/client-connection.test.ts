import type { Client } from '@temporalio/client';
import { describe, expect, it, vi } from 'vitest';

import { TemporalWorkflowEngine } from '../src/client/index';
import type { BaseNode, WorkflowExecutionInput } from '../src/core-contract';

const INPUT: WorkflowExecutionInput<BaseNode> = {
  workflowId: 'w-1',
  executionId: 'e-1',
  definition: { workflowId: 'w-1', nodes: [], edges: [] },
  triggerPayload: {},
  variables: {},
  global: {},
};

// Just enough of a Client for submit, cancel and resolveNode.
function fakeClient() {
  const start = vi.fn(async () => {});
  const cancel = vi.fn(async () => {});
  const executeUpdate = vi.fn(async () => {});
  const withDeadline = vi.fn(async (_deadline: number, run: () => Promise<unknown>) => run());
  const client = {
    withDeadline,
    workflow: { start, getHandle: () => ({ cancel, executeUpdate }) },
  } as unknown as Client;
  return { client, start, cancel, executeUpdate };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('TemporalWorkflowEngine connection', () => {
  it('connects again on the next call after a failed first attempt', async () => {
    const { client, start } = fakeClient();
    const factory = vi
      .fn<() => Promise<Client>>()
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
      .mockResolvedValueOnce(client);
    const engine = new TemporalWorkflowEngine({ client: factory });

    await expect(engine.submit(INPUT)).rejects.toThrow('connect ECONNREFUSED');
    await engine.submit(INPUT);

    expect(factory).toHaveBeenCalledTimes(2);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('keeps a working connection for every later call', async () => {
    const { client, start, cancel, executeUpdate } = fakeClient();
    const factory = vi.fn(async () => client);
    const engine = new TemporalWorkflowEngine({ client: factory });

    await engine.submit(INPUT);
    await engine.cancel('e-1');
    await engine.resolveNode({ executionId: 'e-1', nodeId: 'n-1', resolution: { output: 1 } });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(executeUpdate).toHaveBeenCalledTimes(1);
  });

  it('shares one attempt between calls made while it connects', async () => {
    const { client, start } = fakeClient();
    const connecting = deferred<Client>();
    const factory = vi.fn(() => connecting.promise);
    const engine = new TemporalWorkflowEngine({ client: factory });

    const first = engine.submit(INPUT);
    const second = engine.submit(INPUT);
    connecting.resolve(client);
    await Promise.all([first, second]);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('fails every call waiting on a failed attempt, and the call after them connects again', async () => {
    const { client, start } = fakeClient();
    const connecting = deferred<Client>();
    const factory = vi
      .fn<() => Promise<Client>>()
      .mockReturnValueOnce(connecting.promise)
      .mockResolvedValueOnce(client);
    const engine = new TemporalWorkflowEngine({ client: factory });

    const first = engine.submit(INPUT);
    const second = engine.cancel('e-1');
    connecting.reject(new Error('connect ECONNREFUSED'));
    await expect(first).rejects.toThrow('connect ECONNREFUSED');
    await expect(second).rejects.toThrow('connect ECONNREFUSED');

    await engine.submit(INPUT);

    expect(factory).toHaveBeenCalledTimes(2);
    expect(start).toHaveBeenCalledTimes(1);
  });
});

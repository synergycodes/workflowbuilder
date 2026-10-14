import { type Client, WorkflowExecutionAlreadyStartedError, WorkflowNotFoundError } from '@temporalio/client';
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

const WORKFLOW_ID = 'execution-e-1';

// Just enough of a Client for submit and cancel.
function fakeClient() {
  const start = vi.fn<() => Promise<unknown>>(async () => ({}));
  const describeRun = vi.fn<() => Promise<unknown>>(async () => ({}));
  const cancel = vi.fn<() => Promise<void>>(async () => {});
  const getHandle = vi.fn(() => ({ describe: describeRun, cancel }));
  const withDeadline = vi.fn(async (_deadline: number, run: () => Promise<unknown>) => run());
  const client = { withDeadline, workflow: { start, getHandle } } as unknown as Client;
  return { client, start, describeRun, cancel, getHandle, withDeadline };
}

const unreachable = () => new Error('connect ECONNREFUSED 127.0.0.1:7233');
const notFound = () => new WorkflowNotFoundError('Workflow not found', WORKFLOW_ID, undefined);

describe('TemporalWorkflowEngine.submit', () => {
  it('starts the run under the execution id and answers success', async () => {
    const { client, start } = fakeClient();

    await expect(new TemporalWorkflowEngine({ client }).submit(INPUT)).resolves.toEqual({});

    expect(start).toHaveBeenCalledWith('runWorkflow', expect.objectContaining({ workflowId: WORKFLOW_ID }));
  });

  it('answers run_not_started when no connection can be opened', async () => {
    const engine = new TemporalWorkflowEngine({
      client: async () => {
        throw unreachable();
      },
    });

    await expect(engine.submit(INPUT)).resolves.toEqual({
      error: { code: 'run_not_started', message: 'connect ECONNREFUSED 127.0.0.1:7233' },
    });
  });

  it('answers run_not_started when the start fails and the server has no run under the id', async () => {
    const { client, start, describeRun, getHandle } = fakeClient();
    start.mockRejectedValueOnce(unreachable());
    describeRun.mockRejectedValueOnce(notFound());

    await expect(new TemporalWorkflowEngine({ client }).submit(INPUT)).resolves.toEqual({
      error: { code: 'run_not_started', message: 'connect ECONNREFUSED 127.0.0.1:7233' },
    });

    expect(getHandle).toHaveBeenCalledWith(WORKFLOW_ID);
  });

  it('answers success when the start fails but the server has the run', async () => {
    const { client, start, describeRun } = fakeClient();
    start.mockRejectedValueOnce(new Error('deadline exceeded'));
    describeRun.mockResolvedValueOnce({ status: { name: 'RUNNING' } });

    await expect(new TemporalWorkflowEngine({ client }).submit(INPUT)).resolves.toEqual({});
  });

  it('answers success without asking the server when the run was already started', async () => {
    const { client, start, describeRun } = fakeClient();
    start.mockRejectedValueOnce(
      new WorkflowExecutionAlreadyStartedError('Workflow execution already started', WORKFLOW_ID, 'runWorkflow'),
    );

    await expect(new TemporalWorkflowEngine({ client }).submit(INPUT)).resolves.toEqual({});

    expect(describeRun).not.toHaveBeenCalled();
  });

  it('answers start_unconfirmed when neither the start nor the check reaches the server', async () => {
    const { client, start, describeRun } = fakeClient();
    start.mockRejectedValueOnce(unreachable());
    describeRun.mockRejectedValueOnce(unreachable());

    await expect(new TemporalWorkflowEngine({ client }).submit(INPUT)).resolves.toEqual({
      error: { code: 'start_unconfirmed', message: 'connect ECONNREFUSED 127.0.0.1:7233' },
    });
  });

  it('asks the server under a deadline of its own', async () => {
    const { client, start, describeRun, withDeadline } = fakeClient();
    start.mockRejectedValueOnce(unreachable());
    describeRun.mockRejectedValueOnce(notFound());

    await new TemporalWorkflowEngine({ client }).submit(INPUT);

    expect(withDeadline).toHaveBeenCalledTimes(1);
    expect(withDeadline.mock.calls[0]?.[0]).toBeGreaterThan(Date.now() - 1);
  });

  it('names the whole cause chain in the message', async () => {
    const { client, start, describeRun } = fakeClient();
    start.mockRejectedValueOnce(
      new Error('Failed to start Workflow', { cause: new Error('14 UNAVAILABLE: No connection established') }),
    );
    describeRun.mockRejectedValueOnce(notFound());

    await expect(new TemporalWorkflowEngine({ client }).submit(INPUT)).resolves.toEqual({
      error: {
        code: 'run_not_started',
        message: 'Failed to start Workflow: 14 UNAVAILABLE: No connection established',
      },
    });
  });

  it('names a non-Error cause in the message', async () => {
    const { client, start, describeRun } = fakeClient();
    start.mockRejectedValueOnce('boom');
    describeRun.mockRejectedValueOnce(notFound());

    await expect(new TemporalWorkflowEngine({ client }).submit(INPUT)).resolves.toEqual({
      error: { code: 'run_not_started', message: 'boom' },
    });
  });
});

describe('TemporalWorkflowEngine.cancel', () => {
  it('answers success when the server accepted the cancel', async () => {
    const { client, cancel, getHandle } = fakeClient();

    await expect(new TemporalWorkflowEngine({ client }).cancel('e-1')).resolves.toEqual({});

    expect(getHandle).toHaveBeenCalledWith(WORKFLOW_ID);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('answers run_not_found when the server has no run under the id', async () => {
    const { client, cancel } = fakeClient();
    cancel.mockRejectedValueOnce(notFound());

    await expect(new TemporalWorkflowEngine({ client }).cancel('e-1')).resolves.toEqual({
      error: { code: 'run_not_found', message: 'Workflow not found' },
    });
  });

  it('throws anything else', async () => {
    const { client, cancel } = fakeClient();
    cancel.mockRejectedValueOnce(unreachable());

    await expect(new TemporalWorkflowEngine({ client }).cancel('e-1')).rejects.toThrow('connect ECONNREFUSED');
  });
});

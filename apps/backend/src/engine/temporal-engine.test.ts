import { WorkflowNotFoundError } from '@temporalio/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowExecutionInput } from '@workflow-builder/execution-core/workflow';
import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

import { TemporalEngine } from './temporal-engine';

const { cancelMock, connectMock, getHandleMock, startMock } = vi.hoisted(() => ({
  cancelMock: vi.fn(),
  connectMock: vi.fn(),
  getHandleMock: vi.fn(),
  startMock: vi.fn(),
}));

vi.mock('@temporalio/client', () => {
  class WorkflowNotFoundError extends Error {
    constructor(
      message: string,
      readonly workflowId: string,
      readonly runId: string | undefined,
    ) {
      super(message);
    }
  }

  class Client {
    readonly workflow = {
      start: startMock,
      getHandle: getHandleMock,
    };
  }

  return {
    Client,
    Connection: { connect: connectMock },
    WorkflowNotFoundError,
  };
});

function executionInput(): WorkflowExecutionInput<BaseNode> {
  return {
    workflowId: 'workflow-1',
    executionId: 'execution-1',
    definition: {
      workflowId: 'workflow-1',
      nodes: [{ id: 'node-1', type: 'product/start', config: {}, role: 'start' }],
      edges: [],
    },
    triggerPayload: { prompt: 'hello' },
    variables: {},
    global: { greeting: 'world' },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  connectMock.mockResolvedValue({ connection: true });
  getHandleMock.mockReturnValue({ cancel: cancelMock });
});

describe('TemporalEngine', () => {
  it('submits to the task queue injected by the server', async () => {
    const engine = new TemporalEngine('demo-workflow-execution');
    const input = executionInput();

    await engine.submit(input);

    expect(connectMock).toHaveBeenCalledWith({ address: '127.0.0.1:7233' });
    expect(startMock).toHaveBeenCalledWith('runWorkflow', {
      taskQueue: 'demo-workflow-execution',
      workflowId: 'execution-execution-1',
      args: [input],
    });
  });

  it('ignores taskQueue and runtime fields smuggled into the execution input', async () => {
    const engine = new TemporalEngine('workflow-execution');
    const input = Object.assign(executionInput(), {
      taskQueue: 'client-controlled-queue',
      runtime: 'demo',
    });

    await engine.submit(input);

    expect(startMock).toHaveBeenCalledWith(
      'runWorkflow',
      expect.objectContaining({ taskQueue: 'workflow-execution', args: [input] }),
    );
  });

  it('reuses one Temporal client connection across submissions and cancellations', async () => {
    const engine = new TemporalEngine('workflow-execution');

    await engine.submit(executionInput());
    await engine.cancel('execution-1');
    await engine.submit({ ...executionInput(), executionId: 'execution-2' });

    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(getHandleMock).toHaveBeenCalledWith('execution-execution-1');
    expect(cancelMock).toHaveBeenCalledTimes(1);
  });

  it('treats an already-missing Temporal workflow as an idempotent cancellation', async () => {
    cancelMock.mockRejectedValue(new WorkflowNotFoundError('gone', 'execution-execution-1', undefined));
    const engine = new TemporalEngine('workflow-execution');

    await expect(engine.cancel('execution-1')).resolves.toBeUndefined();
  });

  it('does not hide other cancellation errors', async () => {
    const error = new Error('Temporal unavailable');
    cancelMock.mockRejectedValue(error);
    const engine = new TemporalEngine('workflow-execution');

    await expect(engine.cancel('execution-1')).rejects.toBe(error);
  });
});

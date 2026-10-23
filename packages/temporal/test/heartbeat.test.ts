import { CancelledFailure, WorkflowFailedError } from '@temporalio/client';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, bundleWorkflowCode } from '@temporalio/worker';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { RUN_WORKFLOW_NAME, WorkflowBuilderPlugin, type WorkflowExecutionInput } from '../src/index';
import { heartbeatProfiles } from './fixtures/heartbeat-profiles';
import { waitUntil } from './fixtures/helpers';
import { createRecordingStore } from './fixtures/recording-store';
import { type ShellNode, createShellExecutor } from './fixtures/shell-executor';

describe('shell activity heartbeats on a real Temporal server', () => {
  let env: TestWorkflowEnvironment;
  let workflowBundle: { code: string };

  beforeAll(async () => {
    [workflowBundle, env] = await Promise.all([
      bundleWorkflowCode({
        workflowsPath: fileURLToPath(new URL('fixtures/workflows-with-heartbeat.ts', import.meta.url)),
      }),
      TestWorkflowEnvironment.createLocal(),
    ]);
  }, 300_000);

  afterAll(async () => {
    await env?.teardown();
  });

  async function setup(config: ShellNode['config']) {
    const id = randomUUID();
    const store = createRecordingStore();
    const shell = createShellExecutor();
    const plugin = new WorkflowBuilderPlugin<ShellNode>({
      store,
      executors: shell.executors,
      taskQueue: id,
      nodeActivityProfiles: heartbeatProfiles,
    });
    const worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: id,
      workflowBundle,
      plugins: [plugin],
    });
    const input: WorkflowExecutionInput<ShellNode> = {
      workflowId: id,
      executionId: id,
      triggerPayload: {},
      variables: {},
      global: {},
      definition: {
        workflowId: id,
        nodes: [
          { id: 'shell', type: 'test/shell', role: 'start', config },
          { id: 'after', type: 'test/shell', config: { seconds: 0, heartbeat: true } },
        ],
        edges: [{ id: 'edge', sourceNodeId: 'shell', targetNodeId: 'after' }],
      },
    };
    const handle = await env.client.workflow.start(RUN_WORKFLOW_NAME, { taskQueue: id, workflowId: id, args: [input] });
    return { worker, handle, store, shell };
  }

  it('heartbeats keep a shell step alive beyond the heartbeat timeout and deliver its output downstream', async () => {
    const { worker, handle, store, shell } = await setup({ seconds: 4, heartbeat: true });
    await worker.runUntil(async () => {
      try {
        await handle.result();
      } finally {
        shell.stop();
      }
    });

    expect(shell.outputs).toEqual(['shell', 'after']);
    expect(shell.inputs.after.shell).toBe('shell');
    expect(shell.processes.every((process) => process.closed)).toBe(true);
    expect(store.statuses.at(-1)?.status).toBe('completed');
    const history = await handle.fetchHistory();
    const scheduled = history.events?.find(
      (event) => event.activityTaskScheduledEventAttributes?.activityType?.name === 'executeNode',
    )?.activityTaskScheduledEventAttributes;
    expect(scheduled?.heartbeatTimeout).toMatchObject({ seconds: expect.objectContaining({ low: 2 }) });
  }, 60_000);

  it('workflow cancellation aborts the running shell process before worker shutdown and skips downstream', async () => {
    const { worker, handle, store, shell } = await setup({ seconds: 20, heartbeat: true });
    await worker.runUntil(async () => {
      try {
        await waitUntil(() => shell.processes.length === 1, 'the shell process');
        const started = Date.now();
        await handle.cancel();
        const failure: unknown = await handle.result().catch((error: unknown) => error);
        expect(failure).toBeInstanceOf(WorkflowFailedError);
        expect((failure as WorkflowFailedError).cause).toBeInstanceOf(CancelledFailure);
        await waitUntil(() => shell.processes[0].closed, 'shell cancellation before worker shutdown', 10_000);
        expect(shell.processes[0].cancelled).toBe(true);
        expect(() => process.kill(shell.processes[0].pid, 0)).toThrow();
        expect(Date.now() - started).toBeLessThan(10_000);
      } finally {
        shell.stop();
      }
    });

    expect(shell.outputs).toEqual([]);
    expect(shell.processes).toHaveLength(1);
    expect(store.statuses.at(-1)?.status).toBe('cancelled');
  }, 60_000);

  it('stopped heartbeats fail with HEARTBEAT well before start-to-close and do not retry a side-effecting step', async () => {
    const { worker, handle, store, shell } = await setup({ seconds: 20, heartbeat: false });
    await worker.runUntil(async () => {
      try {
        const started = Date.now();
        const failure: unknown = await handle.result().catch((error: unknown) => error);
        expect(failure).toBeInstanceOf(WorkflowFailedError);
        const history = await handle.fetchHistory();
        const timeout = history.events?.find((event) => event.activityTaskTimedOutEventAttributes);
        expect(timeout?.activityTaskTimedOutEventAttributes?.failure?.timeoutFailureInfo?.timeoutType).toBe(4);
        expect(store.statuses.at(-1)?.status).toBe('failed');
        expect(shell.processes).toHaveLength(1);
        expect(shell.outputs).toEqual([]);
        expect(Date.now() - started).toBeLessThan(15_000);
      } finally {
        shell.stop();
      }
    });
    expect(shell.processes[0].closed).toBe(true);
  }, 60_000);
});

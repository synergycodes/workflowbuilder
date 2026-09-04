// The task's verify-by on the harness: a run parks at a gate, survives a worker
// restart, and a resolveNode update resumes it with downstream running exactly once.
import { WorkflowFailedError, WorkflowUpdateFailedError } from '@temporalio/client';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, bundleWorkflowCode } from '@temporalio/worker';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  RUN_WORKFLOW_NAME,
  WorkflowBuilderPlugin,
  type WorkflowExecutionInput,
  executionWorkflowId,
} from '../src/index';
import { resolveNodeUpdate } from '../src/workflow/index';
import { type RecordingStore, createRecordingStore } from './fixtures/graph';
import {
  type PauseHarness,
  type PauseTestNode,
  SINGLE_GATE_GRAPH,
  TWO_GATES_GRAPH,
  createPauseExecutors,
} from './fixtures/pause-graph';

async function waitUntil(check: () => boolean, what: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function eventTypes(store: RecordingStore, nodeId?: string): string[] {
  return store.events.filter((event) => nodeId === undefined || event.nodeId === nodeId).map((event) => event.type);
}

// node_not_waiting is retryable by contract: a verdict can race the parking
// activation (see the decision log). Tests deliver verdicts the way callers should.
async function executeVerdictWithRetry(send: () => Promise<unknown>): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await send();
      return;
    } catch (error) {
      const racingPark =
        error instanceof WorkflowUpdateFailedError &&
        (error.cause as { type?: string } | undefined)?.type === 'node_not_waiting';
      if (!racingPark || attempt >= 40) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

async function expectRejected(update: Promise<unknown>, code: string): Promise<void> {
  const outcome: unknown = await update.then(
    () => 'unexpectedly accepted',
    (error: unknown) => error,
  );
  expect(outcome).toBeInstanceOf(WorkflowUpdateFailedError);
  expect((outcome as WorkflowUpdateFailedError).cause).toMatchObject({ type: code });
}

describe('durable pause', () => {
  let env: TestWorkflowEnvironment;
  let workflowBundle: { code: string };

  beforeAll(async () => {
    [workflowBundle, env] = await Promise.all([
      bundleWorkflowCode({ workflowsPath: fileURLToPath(new URL('fixtures/workflows.ts', import.meta.url)) }),
      TestWorkflowEnvironment.createLocal(),
    ]);
  }, 300_000);

  afterAll(async () => {
    await env?.teardown();
  });

  function createWorker(taskQueue: string, store: RecordingStore, harness: PauseHarness): Promise<Worker> {
    const plugin = new WorkflowBuilderPlugin<PauseTestNode>({ store, executors: harness.executors, taskQueue });
    return Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: plugin.taskQueue,
      workflowBundle,
      plugins: [plugin],
    });
  }

  function startRun(taskQueue: string, executionId: string, definition: typeof SINGLE_GATE_GRAPH) {
    const input: WorkflowExecutionInput<PauseTestNode> = {
      workflowId: definition.workflowId,
      executionId,
      definition,
      triggerPayload: {},
      variables: {},
      global: {},
    };
    return env.client.workflow.start(RUN_WORKFLOW_NAME, {
      taskQueue,
      workflowId: executionWorkflowId(executionId),
      args: [input],
    });
  }

  it('survives a worker restart while parked; the verdict resumes it and downstream runs exactly once', async () => {
    const taskQueue = 'pause-restart';
    const store = createRecordingStore();
    const harness = createPauseExecutors();
    const handle = await startRun(taskQueue, 'pause-restart-execution', SINGLE_GATE_GRAPH);

    const worker1 = await createWorker(taskQueue, store, harness);
    await worker1.runUntil(
      waitUntil(() => store.statuses.some((entry) => entry.status === 'waiting'), 'the waiting status'),
    );

    // Worker 1 is gone; the run is parked in Event History, visible only as state.
    expect(harness.executed).toEqual(['start', 'gate']);
    expect(store.statuses).toEqual([{ status: 'waiting', errorMessage: undefined }]);

    const worker2 = await createWorker(taskQueue, store, harness);
    await worker2.runUntil(async () => {
      await executeVerdictWithRetry(() =>
        handle.executeUpdate(resolveNodeUpdate, { args: [{ nodeId: 'gate', resolution: { output: 'approved' } }] }),
      );
      await handle.result();
    });

    // Replay on worker 2 reconstructed the pause without re-running any activity.
    expect(harness.executed).toEqual(['start', 'gate', 'after']);
    expect(harness.inputsSeen.after.gate).toBe('approved');
    expect(eventTypes(store, 'gate')).toEqual(['node_started', 'node_waiting', 'node_completed']);
    expect(store.events.at(-1)?.type).toBe('execution_completed');
    expect(store.statuses.map((entry) => entry.status)).toEqual(['waiting', 'running', 'completed']);
  }, 120_000);

  it('two gates park concurrently, take verdicts independently, and a duplicate verdict is rejected', async () => {
    const taskQueue = 'pause-two-gates';
    const store = createRecordingStore();
    const harness = createPauseExecutors();
    const handle = await startRun(taskQueue, 'pause-two-gates-execution', TWO_GATES_GRAPH);

    const worker = await createWorker(taskQueue, store, harness);
    await worker.runUntil(async () => {
      await waitUntil(
        () =>
          eventTypes(store).filter((type) => type === 'node_waiting').length === 2 &&
          store.statuses.some((entry) => entry.status === 'waiting'),
        'both gates to park',
      );

      await executeVerdictWithRetry(() =>
        handle.executeUpdate(resolveNodeUpdate, { args: [{ nodeId: 'gate-a', resolution: { output: 'first' } }] }),
      );
      const rejection: unknown = await handle
        .executeUpdate(resolveNodeUpdate, { args: [{ nodeId: 'gate-a', resolution: { output: 'second' } }] })
        .catch((error: unknown) => error);
      expect(rejection).toBeInstanceOf(WorkflowUpdateFailedError);
      expect((rejection as WorkflowUpdateFailedError).cause).toMatchObject({ type: 'verdict_already_delivered' });
      await executeVerdictWithRetry(() =>
        handle.executeUpdate(resolveNodeUpdate, { args: [{ nodeId: 'gate-b', resolution: { output: 'b-verdict' } }] }),
      );
      await handle.result();
    });

    expect(harness.inputsSeen.join['gate-a']).toBe('first');
    expect(harness.inputsSeen.join['gate-b']).toBe('b-verdict');
    expect(harness.executed.filter((id) => id === 'join')).toHaveLength(1);
    expect(store.statuses.map((entry) => entry.status)).toEqual(['waiting', 'running', 'completed']);
  }, 120_000);

  it('rejects malformed and misaddressed verdicts before acceptance; the parked run stays resolvable', async () => {
    const taskQueue = 'pause-validation';
    const store = createRecordingStore();
    const harness = createPauseExecutors();
    const handle = await startRun(taskQueue, 'pause-validation-execution', SINGLE_GATE_GRAPH);

    const worker = await createWorker(taskQueue, store, harness);
    await worker.runUntil(async () => {
      await waitUntil(() => store.statuses.some((entry) => entry.status === 'waiting'), 'the waiting status');

      // Rejection classes live in verdict-validation.test.ts; this pins the
      // end-to-end property: a rejected update leaves the parked run resolvable.
      await expectRejected(handle.executeUpdate('resolveNode', { args: [] }), 'verdict_malformed');
      await expectRejected(
        handle.executeUpdate('resolveNode', { args: [{ nodeId: 'ghost', resolution: { output: 1 } }] }),
        'verdict_for_unknown_node',
      );

      await executeVerdictWithRetry(() =>
        handle.executeUpdate(resolveNodeUpdate, { args: [{ nodeId: 'gate', resolution: { output: 'approved' } }] }),
      );
      await handle.result();
    });

    expect(harness.executed).toEqual(['start', 'gate', 'after']);
    expect(store.statuses.map((entry) => entry.status)).toEqual(['waiting', 'running', 'completed']);
  }, 120_000);

  it('cancel while waiting closes the run as cancelled, with no node_failed for the gate', async () => {
    const taskQueue = 'pause-cancel';
    const store = createRecordingStore();
    const harness = createPauseExecutors();
    const handle = await startRun(taskQueue, 'pause-cancel-execution', SINGLE_GATE_GRAPH);

    const worker = await createWorker(taskQueue, store, harness);
    await worker.runUntil(async () => {
      // The 'waiting' status lands after node_waiting; cancelling earlier would
      // cancel that activity before it runs and make the trail racy.
      await waitUntil(() => store.statuses.some((entry) => entry.status === 'waiting'), 'the waiting status');
      await handle.cancel();
      await expect(handle.result()).rejects.toBeInstanceOf(WorkflowFailedError);
    });

    const types = eventTypes(store);
    expect(types.at(-1)).toBe('execution_cancelled');
    expect(types.indexOf('node_waiting')).toBeLessThan(types.indexOf('execution_cancelled'));
    expect(types).not.toContain('node_failed');
    expect(store.statuses.map((entry) => entry.status)).toEqual(['waiting', 'cancelled']);
  }, 120_000);
});

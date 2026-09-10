// The task's verify-by on the harness: a run parks at a gate, survives a worker
// restart, and a resolveNode update resumes it with downstream running exactly once.
import { CancelledFailure, WorkflowFailedError, WorkflowUpdateFailedError } from '@temporalio/client';
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
import { acceptedUpdateIds, waitUntil } from './fixtures/helpers';
import {
  PORT_ROUTED_GRAPH,
  type PauseHarness,
  type PauseTestNode,
  SINGLE_GATE_GRAPH,
  TWO_GATES_GRAPH,
  createPauseExecutors,
  holdAnnouncement,
} from './fixtures/pause-graph';

function eventTypes(store: RecordingStore, nodeId?: string): string[] {
  return store.events.filter((event) => nodeId === undefined || event.nodeId === nodeId).map((event) => event.type);
}

// The earliest observable moment; delivering right here is the claim under test.
function whenAnnounced(store: RecordingStore, nodeId: string): Promise<void> {
  return waitUntil(() => eventTypes(store, nodeId).includes('node_waiting'), `node_waiting for ${nodeId}`);
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
      await handle.executeUpdate(resolveNodeUpdate, { args: [{ nodeId: 'gate', resolution: { output: 'approved' } }] });
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
      await Promise.all([whenAnnounced(store, 'gate-a'), whenAnnounced(store, 'gate-b')]);

      await handle.executeUpdate(resolveNodeUpdate, { args: [{ nodeId: 'gate-a', resolution: { output: 'first' } }] });
      const rejection: unknown = await handle
        .executeUpdate(resolveNodeUpdate, { args: [{ nodeId: 'gate-a', resolution: { output: 'second' } }] })
        .catch((error: unknown) => error);
      expect(rejection).toBeInstanceOf(WorkflowUpdateFailedError);
      expect((rejection as WorkflowUpdateFailedError).cause).toMatchObject({ type: 'verdict_already_delivered' });
      await handle.executeUpdate(resolveNodeUpdate, {
        args: [{ nodeId: 'gate-b', resolution: { output: 'b-verdict' } }],
      });
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
      await whenAnnounced(store, 'gate');

      // Rejection classes live in verdict-validation.test.ts; this pins the
      // end-to-end property: a rejected update leaves the parked run resolvable.
      await expectRejected(
        handle.executeUpdate('resolveNode', { args: [], updateId: 'malformed-verdict' }),
        'verdict_malformed',
      );
      await expectRejected(
        handle.executeUpdate('resolveNode', {
          args: [{ nodeId: 'ghost', resolution: { output: 1 } }],
          updateId: 'verdict-for-ghost',
        }),
        'verdict_for_unknown_node',
      );

      await handle.executeUpdate(resolveNodeUpdate, { args: [{ nodeId: 'gate', resolution: { output: 'approved' } }] });
      await handle.result();
    });

    expect(harness.executed).toEqual(['start', 'gate', 'after']);
    expect(store.statuses.map((entry) => entry.status)).toEqual(['waiting', 'running', 'completed']);

    // The same error class would also come back from an accepted handler that threw
    // later; only history shows the rejections happened before acceptance.
    const accepted = acceptedUpdateIds(await handle.fetchHistory());
    expect(accepted).toHaveLength(1);
    expect(accepted).not.toContain('malformed-verdict');
    expect(accepted).not.toContain('verdict-for-ghost');
  }, 120_000);

  it('a verdict with output: undefined resumes the node, even though the payload converter drops the field', async () => {
    const taskQueue = 'pause-undefined-output';
    const store = createRecordingStore();
    const harness = createPauseExecutors();
    const handle = await startRun(taskQueue, 'pause-undefined-output-execution', PORT_ROUTED_GRAPH);

    const worker = await createWorker(taskQueue, store, harness);
    await worker.runUntil(async () => {
      await whenAnnounced(store, 'gate');
      await handle.executeUpdate(resolveNodeUpdate, {
        args: [{ nodeId: 'gate', resolution: { output: undefined, nextPort: 'approved' } }],
      });
      await handle.result();
    });

    expect(harness.executed).toEqual(['start', 'gate', 'after']);
    // The activity context crosses the same converter, so downstream sees no `gate` key at all.
    expect(harness.inputsSeen.after).toEqual({ start: { visited: 'start' } });
    expect(eventTypes(store, 'gate')).toEqual(['node_started', 'node_waiting', 'node_completed']);
    expect(store.statuses.map((entry) => entry.status)).toEqual(['waiting', 'running', 'completed']);
  }, 120_000);

  it('rejects a verdict before the node parks, and accepts one the instant node_waiting is announced', async () => {
    const taskQueue = 'pause-held';
    const store = createRecordingStore();
    const announcement = holdAnnouncement(store, 'gate');
    const harness = createPauseExecutors({ holdWaiting: true });
    const handle = await startRun(taskQueue, 'pause-held-execution', SINGLE_GATE_GRAPH);

    const worker = await createWorker(taskQueue, announcement.store, harness);
    await worker.runUntil(async () => {
      // Shutdown waits for held activities, so a failed assertion here must still release both.
      try {
        await waitUntil(() => eventTypes(store, 'gate').includes('node_started'), 'node_started for the waiting node');
        await expectRejected(
          handle.executeUpdate('resolveNode', {
            args: [{ nodeId: 'gate', resolution: { output: 'too early' } }],
            updateId: 'verdict-before-parking',
          }),
          'node_not_waiting',
        );

        harness.release();
        await whenAnnounced(store, 'gate');
        await handle.executeUpdate(resolveNodeUpdate, {
          args: [{ nodeId: 'gate', resolution: { output: 'approved' } }],
        });
        // Accepted while the announcing activity is still in flight: the status write comes after it.
        expect(store.statuses).toEqual([]);
      } finally {
        harness.release();
        announcement.release();
      }

      await handle.result();
    });

    expect(harness.executed).toEqual(['start', 'gate', 'after']);
    expect(harness.inputsSeen.after.gate).toBe('approved');
    expect(eventTypes(store, 'gate')).toEqual(['node_started', 'node_waiting', 'node_completed']);
    expect(store.statuses.map((entry) => entry.status)).toEqual(['waiting', 'running', 'completed']);
    expect(acceptedUpdateIds(await handle.fetchHistory())).not.toContain('verdict-before-parking');
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
      // WorkflowFailedError wraps a plain failure too; the cause is what says Cancelled.
      const failure: unknown = await handle.result().then(
        () => 'unexpectedly completed',
        (error: unknown) => error,
      );
      expect(failure).toBeInstanceOf(WorkflowFailedError);
      expect((failure as WorkflowFailedError).cause).toBeInstanceOf(CancelledFailure);
    });

    const history = await handle.fetchHistory();
    expect(history.events?.at(-1)?.workflowExecutionCanceledEventAttributes).toBeDefined();

    const types = eventTypes(store);
    expect(types.at(-1)).toBe('execution_cancelled');
    expect(types.indexOf('node_waiting')).toBeLessThan(types.indexOf('execution_cancelled'));
    expect(types).not.toContain('node_failed');
    expect(store.statuses.map((entry) => entry.status)).toEqual(['waiting', 'cancelled']);
  }, 120_000);
});

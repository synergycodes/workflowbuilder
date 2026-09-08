// The durable-pause replay pin: a history with a parked gate and a delivered verdict,
// recorded by an older build, must replay under the current code — see ./README.md.
import { type History, historyToJSON } from '@temporalio/common/lib/proto-utils';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, bundleWorkflowCode } from '@temporalio/worker';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  RUN_WORKFLOW_NAME,
  WorkflowBuilderPlugin,
  type WorkflowExecutionInput,
  executionWorkflowId,
} from '../../src/index';
import { resolveNodeUpdate } from '../../src/workflow/index';
import { type RecordingStore, createRecordingStore } from '../fixtures/graph';
import { countScheduledActivities, executeVerdictWithRetry, waitUntil } from '../fixtures/helpers';
import { type PauseTestNode, SINGLE_GATE_GRAPH, createPauseExecutors } from '../fixtures/pause-graph';

const EXECUTION_ID = 'parked-gate-replay-execution';
const TASK_QUEUE = 'parked-gate-replay';

const COMMITTED_HISTORY = new URL('histories/v0-parked-gate.json', import.meta.url);

// start + gate + after: the usual started/completed pair per node, execution brackets,
// one node_waiting, and the waiting → running → completed status transitions.
const EXPECTED_ACTIVITY_COUNTS = {
  executeNode: 3,
  emitEvent: 2 + 3 * 2 + 1,
  updateStatus: 3,
};

describe('replay — parked gate', () => {
  let env: TestWorkflowEnvironment;
  let workflowBundle: { code: string };
  let history: History;
  let store: RecordingStore;

  beforeAll(async () => {
    [workflowBundle, env] = await Promise.all([
      bundleWorkflowCode({ workflowsPath: fileURLToPath(new URL('../fixtures/workflows.ts', import.meta.url)) }),
      TestWorkflowEnvironment.createLocal(),
    ]);

    store = createRecordingStore();
    const harness = createPauseExecutors();

    const plugin = new WorkflowBuilderPlugin<PauseTestNode>({
      store,
      executors: harness.executors,
      taskQueue: TASK_QUEUE,
    });

    const worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: plugin.taskQueue,
      workflowBundle,
      plugins: [plugin],
    });

    const input: WorkflowExecutionInput<PauseTestNode> = {
      workflowId: SINGLE_GATE_GRAPH.workflowId,
      executionId: EXECUTION_ID,
      definition: SINGLE_GATE_GRAPH,
      triggerPayload: {},
      variables: {},
      global: {},
    };

    const handle = await env.client.workflow.start(RUN_WORKFLOW_NAME, {
      taskQueue: plugin.taskQueue,
      workflowId: executionWorkflowId(EXECUTION_ID),
      args: [input],
    });

    await worker.runUntil(async () => {
      await waitUntil(() => store.statuses.some((entry) => entry.status === 'waiting'), 'the waiting status');
      await executeVerdictWithRetry(() =>
        handle.executeUpdate(resolveNodeUpdate, { args: [{ nodeId: 'gate', resolution: { output: 'approved' } }] }),
      );
      await handle.result();
    });

    history = await handle.fetchHistory();

    if (process.env.UPDATE_REPLAY_HISTORIES) {
      await writeFile(COMMITTED_HISTORY, `${historyToJSON(history)}\n`);
    }
  }, 300_000);

  afterAll(async () => {
    await env?.teardown();
  });

  it('parks, takes the verdict and completes through the plugin', () => {
    expect(store.statuses.map((entry) => entry.status)).toEqual(['waiting', 'running', 'completed']);
    expect(store.events.at(-1)?.type).toBe('execution_completed');

    const gateEvents = store.events.filter((event) => event.nodeId === 'gate').map((event) => event.type);
    expect(gateEvents).toEqual(['node_started', 'node_waiting', 'node_completed']);
  });

  it('schedules one activity per node, per event and per status transition', () => {
    expect(countScheduledActivities(history)).toEqual(EXPECTED_ACTIVITY_COUNTS);
  });

  it('replays the history it just recorded', async () => {
    await expect(Worker.runReplayHistory({ workflowBundle }, history)).resolves.toBeUndefined();
  });

  it('replays a parked-and-resumed history recorded before the current code', async () => {
    // The cross-version guard for runs waiting on a verdict across a deploy.
    const recorded: unknown = JSON.parse(await readFile(COMMITTED_HISTORY, 'utf8'));

    await expect(Worker.runReplayHistory({ workflowBundle }, recorded)).resolves.toBeUndefined();
  }, 60_000);
});

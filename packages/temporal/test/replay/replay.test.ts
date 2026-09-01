// The live half of the replay guard.
//
// `graph-runner.replay-determinism.test.ts` in execution-core proves the runner is
// reproducible against itself by re-executing it — cheap, and it catches every
// non-deterministic primitive the audit enumerates. What it structurally cannot see is
// the thing Temporal actually enforces: the sequence of *commands* a workflow produces.
// That only exists once a real server has recorded a real Event History.
//
// So this file runs the graph against a real Temporal, then feeds the recorded history
// back through Temporal's own replayer. A change that makes `runGraph` schedule one
// more activity, or schedule them in a different order, fails here — as a
// DeterminismViolationError — rather than in a customer's in-flight run.
//
// See ../../../execution-core/replay-audit.md for the audit these tests enforce, and
// ./README.md for the rules around the committed histories.
// `History` lives behind this path in the SDK's own public .d.ts (see
// @temporalio/client's workflow-client.d.ts), so the deep import is the supported one.
// `historyToJSON` writes the same shape as `temporal workflow show --output json`,
// which is what makes a committed history interchangeable with a hand-recorded one.
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
import {
  REPLAY_TEST_GRAPH,
  REPLAY_TEST_WORKFLOW_ID,
  type RecordingStore,
  type ReplayTestNode,
  createRecordingStore,
  replayTestExecutors,
} from '../fixtures/graph';

const EXECUTION_ID = 'replay-test-execution';
const TASK_QUEUE = 'replay-test';

// Recorded from a real run, committed, and replayed on every CI run so a change that
// would break a run already in flight fails here. Regenerate with:
//   UPDATE_REPLAY_HISTORIES=1 pnpm --filter @workflowbuilder/temporal test
// and read ./README.md before you do — a regenerated file no longer guards the
// version it was named after.
const COMMITTED_HISTORY = new URL('histories/v0-parallel-wave.json', import.meta.url);

// The graph is start → (left, right) → join. Every node emits node_started and
// node_completed, the run brackets those with execution_started and execution_completed,
// and the terminal status is one write. Restated as arithmetic so that a diff in these
// numbers reads as a deliberate change to what the runner emits, not as a mystery.
const NODE_COUNT = REPLAY_TEST_GRAPH.nodes.length;
const EXPECTED_ACTIVITY_COUNTS = {
  executeNode: NODE_COUNT,
  emitEvent: 1 + NODE_COUNT * 2 + 1,
  updateStatus: 1,
};

function countScheduledActivities(history: History): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const event of history.events ?? []) {
    const name = event.activityTaskScheduledEventAttributes?.activityType?.name;
    if (name) {
      counts[name] = (counts[name] ?? 0) + 1;
    }
  }

  return counts;
}

describe('replay', () => {
  let env: TestWorkflowEnvironment;
  let workflowBundle: { code: string };
  let history: History;
  let store: RecordingStore;

  beforeAll(async () => {
    // Bundling is webpack and the local server is a downloaded binary; both are slow
    // and neither depends on the other, so they start together. The bundle is reused
    // by the worker and by every replay below — building it once is most of why this
    // file stays inside a sane runtime.
    [workflowBundle, env] = await Promise.all([
      bundleWorkflowCode({ workflowsPath: fileURLToPath(new URL('../fixtures/workflows.ts', import.meta.url)) }),
      TestWorkflowEnvironment.createLocal(),
    ]);

    store = createRecordingStore();

    const plugin = new WorkflowBuilderPlugin<ReplayTestNode>({
      store,
      executors: replayTestExecutors,
      taskQueue: TASK_QUEUE,
    });

    const worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: plugin.taskQueue,
      workflowBundle,
      plugins: [plugin],
    });

    const input: WorkflowExecutionInput<ReplayTestNode> = {
      workflowId: REPLAY_TEST_WORKFLOW_ID,
      executionId: EXECUTION_ID,
      definition: REPLAY_TEST_GRAPH,
      triggerPayload: {},
      variables: {},
      global: {},
    };

    const workflowId = executionWorkflowId(EXECUTION_ID);

    await worker.runUntil(
      env.client.workflow.execute(RUN_WORKFLOW_NAME, { taskQueue: plugin.taskQueue, workflowId, args: [input] }),
    );

    history = await env.client.workflow.getHandle(workflowId).fetchHistory();

    if (process.env.UPDATE_REPLAY_HISTORIES) {
      await writeFile(COMMITTED_HISTORY, `${historyToJSON(history)}\n`);
    }
  }, 300_000);

  afterAll(async () => {
    await env?.teardown();
  });

  it('runs the graph to completion through the plugin', () => {
    // Guards the tests below from passing against a run that never really happened:
    // an empty history replays clean and counts zero of everything.
    expect(store.statuses).toEqual([{ status: 'completed', errorMessage: undefined }]);
    expect(store.events.at(0)?.type).toBe('execution_started');
    expect(store.events.at(-1)?.type).toBe('execution_completed');

    for (const node of REPLAY_TEST_GRAPH.nodes) {
      const forNode = store.events.filter((event) => event.nodeId === node.id);
      expect(forNode.map((event) => event.type)).toEqual(['node_started', 'node_completed']);
    }
  });

  it('schedules one activity per node and one per emitted event', () => {
    // An extra activity anywhere in runGraph moves one of these numbers, which makes
    // the change something a reviewer has to account for rather than skim past.
    expect(countScheduledActivities(history)).toEqual(EXPECTED_ACTIVITY_COUNTS);
  });

  it('replays the history it just recorded', async () => {
    // Same code, same history: proves the run is reproducible under Temporal's own
    // replayer, not just under our re-execution harness.
    await expect(Worker.runReplayHistory({ workflowBundle }, history)).resolves.toBeUndefined();
  });

  it('replays a history recorded before the current code', async () => {
    // The cross-version guard, and the one that protects a run parked mid-flight
    // across a deploy. Fails when today's code would issue commands the recorded run
    // never made — which is exactly rule 9 of the replay audit.
    const recorded: unknown = JSON.parse(await readFile(COMMITTED_HISTORY, 'utf8'));

    await expect(Worker.runReplayHistory({ workflowBundle }, recorded)).resolves.toBeUndefined();
  }, 60_000);
});

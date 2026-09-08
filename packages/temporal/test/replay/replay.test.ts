// Temporal replay validates command determinism that runner re-execution alone cannot cover.
// Audit these tests enforce: ../../../execution-core/replay-audit.md
// The SDK exposes History through this deep import; historyToJSON matches Temporal CLI history JSON.
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
import { countScheduledActivities } from '../fixtures/helpers';

const EXECUTION_ID = 'replay-test-execution';
const TASK_QUEUE = 'replay-test';

// Regeneration replaces the cross-version baseline; follow ./README.md before enabling it.
//   UPDATE_REPLAY_HISTORIES=1 pnpm --filter @workflowbuilder/temporal test
const COMMITTED_HISTORY = new URL('histories/v0-parallel-wave.json', import.meta.url);

const NODE_COUNT = REPLAY_TEST_GRAPH.nodes.length;
const EVENTS_PER_NODE = 2;
const EXECUTION_BRACKET_EVENTS = 2;
const EXPECTED_ACTIVITY_COUNTS = {
  executeNode: NODE_COUNT,
  emitEvent: EXECUTION_BRACKET_EVENTS + NODE_COUNT * EVENTS_PER_NODE,
  updateStatus: 1,
};

describe('replay', () => {
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
    expect(store.statuses).toEqual([{ status: 'completed', errorMessage: undefined }]);
    expect(store.events.at(0)?.type).toBe('execution_started');
    expect(store.events.at(-1)?.type).toBe('execution_completed');

    for (const node of REPLAY_TEST_GRAPH.nodes) {
      const forNode = store.events.filter((event) => event.nodeId === node.id);
      expect(forNode.map((event) => event.type)).toEqual(['node_started', 'node_completed']);
    }
  });

  it('schedules one activity per node and one per emitted event', () => {
    expect(countScheduledActivities(history)).toEqual(EXPECTED_ACTIVITY_COUNTS);
  });

  it('replays the history it just recorded', async () => {
    await expect(Worker.runReplayHistory({ workflowBundle }, history)).resolves.toBeUndefined();
  });

  it('replays a history recorded before the current code', async () => {
    // Replays a pre-current-code history to protect in-flight executions across deploys.
    const recorded: unknown = JSON.parse(await readFile(COMMITTED_HISTORY, 'utf8'));

    await expect(Worker.runReplayHistory({ workflowBundle }, recorded)).resolves.toBeUndefined();
  }, 60_000);
});

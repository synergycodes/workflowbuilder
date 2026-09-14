// Proves item 6 of the taskQueue-routing issue: a profile's taskQueue reaches the
// real ScheduleActivityTask command, not just the resolved options object.
import { type History } from '@temporalio/common/lib/proto-utils';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, bundleWorkflowCode } from '@temporalio/worker';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { WorkflowBuilderPlugin, type WorkflowExecutionInput, executionWorkflowId } from '../src/index';
import { REPLAY_TEST_GRAPH, createRecordingStore, replayTestExecutors } from './fixtures/graph';
import { SPECIALIZED_TASK_QUEUE } from './fixtures/workflows-with-task-queue';

const EXECUTION_ID = 'task-queue-routing-execution';
const TASK_QUEUE = 'task-queue-routing-test';

describe('taskQueue routing', () => {
  let env: TestWorkflowEnvironment;
  let history: History;

  beforeAll(async () => {
    const [workflowBundle, testEnv] = await Promise.all([
      bundleWorkflowCode({
        workflowsPath: fileURLToPath(new URL('fixtures/workflows-with-task-queue.ts', import.meta.url)),
      }),
      TestWorkflowEnvironment.createLocal(),
    ]);
    env = testEnv;

    const plugin = new WorkflowBuilderPlugin({
      store: createRecordingStore(),
      executors: replayTestExecutors,
      taskQueue: TASK_QUEUE,
    });

    // Polls only the default queue: the routed node's activity is deliberately never
    // executed, so the workflow stays open while its ScheduleActivityTask is inspected.
    const worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: plugin.taskQueue,
      workflowBundle,
      plugins: [plugin],
    });

    const input: WorkflowExecutionInput<(typeof REPLAY_TEST_GRAPH)['nodes'][number]> = {
      workflowId: REPLAY_TEST_GRAPH.workflowId,
      executionId: EXECUTION_ID,
      definition: REPLAY_TEST_GRAPH,
      triggerPayload: {},
      variables: {},
      global: {},
    };

    const workflowId = executionWorkflowId(EXECUTION_ID);

    await worker.runUntil(async () => {
      const handle = await env.client.workflow.start('runWorkflow', {
        taskQueue: plugin.taskQueue,
        workflowId,
        args: [input],
      });

      // The workflow awaits the execution_started DB activity (on the default queue)
      // before scheduling the routed node, so history is polled until that command lands.
      for (let attempt = 0; attempt < 50; attempt += 1) {
        history = await handle.fetchHistory();
        const hasExecuteNode = (history.events ?? []).some(
          (event) => event.activityTaskScheduledEventAttributes?.activityType?.name === 'executeNode',
        );
        if (hasExecuteNode) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await handle.terminate('test cleanup');
    });
  }, 60_000);

  afterAll(async () => {
    await env?.teardown();
  });

  it('schedules the routed node on its profile-declared taskQueue, not the workflow default', () => {
    const scheduled = (history.events ?? []).find(
      (event) => event.activityTaskScheduledEventAttributes?.activityType?.name === 'executeNode',
    );

    expect(scheduled?.activityTaskScheduledEventAttributes?.taskQueue?.name).toBe(SPECIALIZED_TASK_QUEUE);
  });
});

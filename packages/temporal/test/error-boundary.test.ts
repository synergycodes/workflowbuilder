// Runs graphs through a real Temporal dev server, so every assertion crosses the actual
// activity → workflow boundary where a thrown error is serialized and its class is lost.
import { WorkflowFailedError } from '@temporalio/client';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, bundleWorkflowCode } from '@temporalio/worker';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  type BaseNode,
  DEFAULT_NODE_ACTIVITY_PROFILE,
  NodeExecutionError,
  type NodeExecutorRegistry,
  PermanentNodeExecutionError,
  RUN_WORKFLOW_NAME,
  WorkflowBuilderPlugin,
  type WorkflowDefinition,
  type WorkflowExecutionInput,
  executionWorkflowId,
} from '../src/index';
import { type RecordingStore, createRecordingStore } from './fixtures/graph';

type BoundaryNode = (BaseNode & { type: 'test/step' }) | (BaseNode & { type: 'test/fail' });

const TASK_QUEUE = 'error-boundary-test';

function graph(workflowId: string): WorkflowDefinition<BoundaryNode> {
  return {
    workflowId,
    nodes: [
      { id: 'start', type: 'test/step', role: 'start', config: {} },
      { id: 'fail', type: 'test/fail', config: {} },
    ],
    edges: [{ id: 'e-start-fail', sourceNodeId: 'start', targetNodeId: 'fail' }],
  };
}

type Run = { store: RecordingStore; attempts: number; failure: unknown };

function nodeFailedPayload(store: RecordingStore): unknown {
  return store.events.find((event) => event.type === 'node_failed' && event.nodeId === 'fail')?.payload;
}

describe('error classification across the activity boundary', () => {
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

  async function run(executionId: string, thrown: () => Error): Promise<Run> {
    const store = createRecordingStore();
    let attempts = 0;

    const executors: NodeExecutorRegistry<BoundaryNode> = {
      'test/step': () => ({ output: null }),
      'test/fail': () => {
        attempts += 1;
        throw thrown();
      },
    };

    const plugin = new WorkflowBuilderPlugin<BoundaryNode>({ store, executors, taskQueue: TASK_QUEUE });
    const worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: plugin.taskQueue,
      workflowBundle,
      plugins: [plugin],
    });

    const workflowId = `wf-${executionId}`;
    const input: WorkflowExecutionInput<BoundaryNode> = {
      workflowId,
      executionId,
      definition: graph(workflowId),
      triggerPayload: {},
      variables: {},
      global: {},
    };

    const failure = await worker.runUntil(
      env.client.workflow
        .execute(RUN_WORKFLOW_NAME, {
          taskQueue: plugin.taskQueue,
          workflowId: executionWorkflowId(executionId),
          args: [input],
        })
        .catch((error: unknown) => error),
    );

    return { store, attempts, failure };
  }

  it('a permanent throw stops on its first attempt and reaches node_failed with its code', async () => {
    const { store, attempts, failure } = await run(
      'permanent',
      () => new PermanentNodeExecutionError('ai_not_configured', 'AI is not configured on this worker'),
    );

    expect(attempts).toBe(1);
    expect(nodeFailedPayload(store)).toEqual({
      error: { message: 'AI is not configured on this worker', code: 'ai_not_configured', attempt: 1 },
    });
    expect(store.statuses.at(-1)).toMatchObject({ status: 'failed' });

    // The code also names the workflow's terminal failure type.
    expect(failure).toBeInstanceOf(WorkflowFailedError);
    expect((failure as WorkflowFailedError).cause).toMatchObject({ type: 'ai_not_configured' });
  }, 60_000);

  it('an unclassified throw retries per the profile and is reported exactly as before', async () => {
    const { store, attempts } = await run(
      'unclassified',
      () => new NodeExecutionError('no_branch_matched', 'No branch matched'),
    );

    expect(attempts).toBe(DEFAULT_NODE_ACTIVITY_PROFILE.retry.maximumAttempts);
    expect(nodeFailedPayload(store)).toEqual({ error: { message: 'No branch matched' } });
  }, 60_000);
});

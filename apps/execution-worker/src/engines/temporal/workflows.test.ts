import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, bundleWorkflowCode } from '@temporalio/worker';
import { WorkflowBuilderPlugin, type WorkflowExecutionInput } from '@workflowbuilder/temporal';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

import type { AgentHarnessNode } from '../../domain/ai-studio-nodes';
import { nodeActivityProfiles } from './node-activity-profiles';

it('the production workflow bundle schedules the harness with its shared timeout and retry profile', async () => {
  const env = await TestWorkflowEnvironment.createLocal();
  try {
    const workflowBundle = await bundleWorkflowCode({
      workflowsPath: fileURLToPath(new URL('workflows.ts', import.meta.url)),
    });
    const id = randomUUID();
    const plugin = new WorkflowBuilderPlugin<AgentHarnessNode>({
      taskQueue: id,
      nodeActivityProfiles,
      executors: { 'ai-studio/agent-harness': () => ({ output: 'completed' }) },
      store: { emitExecutionEvent: async () => {}, updateExecutionStatus: async () => {} },
    });
    const worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: id,
      workflowBundle,
      plugins: [plugin],
    });
    const input: WorkflowExecutionInput<AgentHarnessNode> = {
      executionId: id,
      workflowId: id,
      triggerPayload: {},
      variables: {},
      global: {},
      definition: {
        workflowId: id,
        nodes: [
          {
            id: 'agent',
            type: 'ai-studio/agent-harness',
            role: 'start',
            config: { prompt: 'test', provider: 'copilot' },
          },
        ],
        edges: [],
      },
    };
    const handle = await env.client.workflow.start('runWorkflow', { taskQueue: id, workflowId: id, args: [input] });
    await worker.runUntil(handle.result());
    const history = await handle.fetchHistory();
    const scheduled = history.events?.find(
      (event) => event.activityTaskScheduledEventAttributes?.activityType?.name === 'executeNode',
    )?.activityTaskScheduledEventAttributes;
    expect(scheduled?.startToCloseTimeout?.seconds?.toNumber()).toBe(2700);
    expect(scheduled?.heartbeatTimeout?.seconds?.toNumber()).toBe(5);
    expect(scheduled?.retryPolicy?.maximumAttempts).toBe(1);
  } finally {
    await env.teardown();
  }
}, 120_000);

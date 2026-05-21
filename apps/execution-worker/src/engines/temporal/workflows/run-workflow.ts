// Temporal workflow entry. Runs inside V8 sandbox — only deterministic code
// + proxyActivities allowed. Delegates graph traversal to the pure runGraph
// from execution-core, wiring Temporal proxyActivities as port implementations.
import { CancellationScope, isCancellation, proxyActivities } from '@temporalio/workflow';

import {
  type ActivityRunnerPort,
  type EventEmitterPort,
  type WorkflowExecutionInput,
  runGraph,
} from '@workflow-builder/execution-core/workflow';

import type { AiStudioNode } from '../../../domain/ai-studio-nodes';
import type { Activities } from '../activities-interface';

// DB activities: fast, idempotent INSERT/UPDATE — short timeout, aggressive retries
const databaseActivities = proxyActivities<Pick<Activities, 'emitEvent' | 'updateStatus'>>({
  startToCloseTimeout: '30s',
  retry: { maximumAttempts: 5 },
});

// Node activities: may call LLMs (minutes) — generous timeout, fewer retries to limit cost on partial failures
const nodeActivities = proxyActivities<Pick<Activities, 'executeNode'>>({
  startToCloseTimeout: '10m',
  retry: { maximumAttempts: 2 },
});

const runner: ActivityRunnerPort<AiStudioNode> = {
  executeNode: (node, context) => nodeActivities.executeNode(node, context),
};

const events: EventEmitterPort = {
  emitEvent: (executionId, type, payload, nodeId) => databaseActivities.emitEvent(executionId, type, payload, nodeId),
  updateStatus: (executionId, status, errorMessage) =>
    databaseActivities.updateStatus(executionId, status, errorMessage),
};

export async function runWorkflow(input: WorkflowExecutionInput<AiStudioNode>): Promise<void> {
  try {
    await runGraph(input, runner, events);
  } catch (error) {
    if (isCancellation(error)) {
      // Root scope is cancelled — shield cleanup so these activities aren't
      // themselves cancelled before they reach the worker.
      await CancellationScope.nonCancellable(async () => {
        await events.emitEvent(input.executionId, 'execution_cancelled', { reason: 'user_request' });
        await events.updateStatus(input.executionId, 'cancelled');
      });
    }
    throw error;
  }
}

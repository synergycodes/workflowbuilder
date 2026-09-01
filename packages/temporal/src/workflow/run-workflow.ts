// Temporal workflow entry. Runs inside the V8 sandbox — only deterministic code
// + proxyActivities allowed. Delegates graph traversal to the pure runGraph from
// execution-core, wiring Temporal proxyActivities as port implementations.
//
// A plugin cannot register this itself: the TypeScript SDK builds the workflow
// bundle from a single module, so the consumer re-exports it from their own
// workflows file. See the package README.
import { ApplicationFailure, CancellationScope, isCancellation, proxyActivities } from '@temporalio/workflow';

import type { Activities } from './activities-interface';
import { DEFAULT_DATABASE_ACTIVITY_PROFILE, type NodeActivityProfiles } from './activity-profiles';
import {
  type ActivityRunnerPort,
  type BaseNode,
  type RunGraphOutcome,
  type WorkflowExecutionInput,
  runGraph,
} from './core-contract';
import { resolveNodeActivityOptions } from './node-activity-options';
import { createSequencedEventEmitter } from './sequenced-event-emitter';

const databaseActivities = proxyActivities<Pick<Activities, 'emitEvent' | 'updateStatus'>>(
  DEFAULT_DATABASE_ACTIVITY_PROFILE,
);

export type RunWorkflowOptions = {
  nodeActivityProfiles?: NodeActivityProfiles;
};

// Profiles arrive here rather than through plugin options because the TypeScript SDK
// compiles the workflow bundle from the consumer's own workflows module, which the
// worker-side plugin cannot reach into. See the README for the snippet.
export function createRunWorkflow(options: RunWorkflowOptions = {}) {
  const profiles = options.nodeActivityProfiles ?? {};

  // Proxied per call, not once per module: the options depend on the node.
  const runner: ActivityRunnerPort<BaseNode> = {
    executeNode: (node, context) => {
      const nodeActivities = proxyActivities<Pick<Activities, 'executeNode'>>(
        resolveNodeActivityOptions(node, profiles),
      );
      return nodeActivities.executeNode(node, context);
    },
  };

  return async function runWorkflow(input: WorkflowExecutionInput<BaseNode>): Promise<void> {
    return runGraphWith(runner, input);
  };
}

// The zero-config workflow, named so Temporal registers it as `runWorkflow`.
export const runWorkflow = createRunWorkflow();

async function runGraphWith(
  runner: ActivityRunnerPort<BaseNode>,
  input: WorkflowExecutionInput<BaseNode>,
): Promise<void> {
  const events = createSequencedEventEmitter(databaseActivities);
  let outcome: RunGraphOutcome;

  try {
    outcome = await runGraph(input, runner, events);
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

  // runGraph already emitted execution_failed and wrote the 'failed' status — this check
  // tells Temporal to close the run as Failed rather than Completed. It has to be a
  // TemporalFailure (anything else fails the workflow *task* and retries forever), and
  // non-retryable since replaying a deterministic graph failure would re-run LLM activities.
  //
  // Only 'failed' throws. An 'incomplete' outcome — a branch that routed to a port with
  // nothing wired to it — falls through on purpose: nothing errored, so the Workflow
  // Execution closes as Completed and the run's own 'incomplete' status carries the
  // detail. Do not add it to this check.
  if (outcome.status === 'failed') {
    throw ApplicationFailure.nonRetryable(outcome.error.message, outcome.error.code ?? 'WorkflowExecutionFailed');
  }
}

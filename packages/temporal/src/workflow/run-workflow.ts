// Temporal workflow entry. Runs inside the V8 sandbox — only deterministic code
// + proxyActivities allowed. Delegates graph traversal to the pure runGraph from
// execution-core, wiring Temporal proxyActivities as port implementations.
//
// A plugin cannot register this itself: the TypeScript SDK builds the workflow
// bundle from a single module, so the consumer re-exports it from their own
// workflows file. See the package README.
import {
  ApplicationFailure,
  CancellationScope,
  condition,
  defineUpdate,
  isCancellation,
  proxyActivities,
  setHandler,
} from '@temporalio/workflow';

import type { Activities } from './activities-interface';
import { DEFAULT_DATABASE_ACTIVITY_PROFILE, type NodeActivityProfiles } from './activity-profiles';
import {
  type ActivityRunnerPort,
  type BaseNode,
  type CompletedNodeExecution,
  type RunGraphOutcome,
  type WorkflowExecutionInput,
  runGraph,
} from './core-contract';
import { resolveFromValidatedProfiles } from './node-activity-options';
import { freezeNodeActivityProfiles } from './profile-validation';
import { createSequencedEventEmitter } from './sequenced-event-emitter';

const databaseActivities = proxyActivities<Pick<Activities, 'emitEvent' | 'updateStatus'>>(
  DEFAULT_DATABASE_ACTIVITY_PROFILE,
);

export type ResolveNodeUpdateInput = {
  nodeId: string;
  resolution: CompletedNodeExecution;
};

// Update-not-signal and the annotation shape: see durable-pause.decision-log.md.
export const resolveNodeUpdate: ReturnType<typeof defineUpdate<void, [ResolveNodeUpdateInput]>> =
  defineUpdate('resolveNode');

export type RunWorkflowOptions = {
  nodeActivityProfiles?: NodeActivityProfiles;
};

// Profiles arrive here rather than through plugin options because the TypeScript SDK
// compiles the workflow bundle from the consumer's own workflows module, which the
// worker-side plugin cannot reach into. See the README for the snippet.
export function createRunWorkflow(options: RunWorkflowOptions = {}) {
  const profiles = freezeNodeActivityProfiles(options.nodeActivityProfiles ?? {});

  return async function runWorkflow(input: WorkflowExecutionInput<BaseNode>): Promise<void> {
    // Per-instance: must stay inside the workflow function (durable-pause.decision-log.md).
    const resolutions = new Map<string, CompletedNodeExecution>();

    setHandler(resolveNodeUpdate, ({ nodeId, resolution }) => {
      if (resolutions.has(nodeId)) {
        throw ApplicationFailure.nonRetryable(`Node "${nodeId}" already has a verdict`, 'verdict_already_delivered');
      }
      resolutions.set(nodeId, resolution);
    });

    const runner: ActivityRunnerPort<BaseNode> = {
      // Proxied per call, not once per module: the options depend on the node.
      executeNode: (node, context) => {
        const nodeActivities = proxyActivities<Pick<Activities, 'executeNode'>>(
          resolveFromValidatedProfiles(node, profiles),
        );
        return nodeActivities.executeNode(node, context);
      },
      awaitResolution: async (nodeId) => {
        await condition(() => resolutions.has(nodeId));
        return resolutions.get(nodeId)!;
      },
    };

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

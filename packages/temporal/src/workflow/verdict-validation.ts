import { ApplicationFailure } from '@temporalio/workflow';

import type { CompletedNodeExecution } from './core-contract';

// A node's wait lifecycle; no entry means the node is not waiting.
export type NodeWaitState = { status: 'waiting' } | { status: 'resolved'; resolution: CompletedNodeExecution };

function malformed(message: string): ApplicationFailure {
  return ApplicationFailure.nonRetryable(message, 'verdict_malformed');
}

// Runs before the update is accepted: a throw rejects it, writes nothing to history
// and cannot fail the workflow task. Engine integrity only (durable-pause.decision-log.md).
export function validateVerdict(
  verdict: unknown,
  knownNodes: ReadonlySet<string>,
  waits: ReadonlyMap<string, NodeWaitState>,
): void {
  if (typeof verdict !== 'object' || verdict === null) {
    throw malformed('Update input must be a { nodeId, resolution } object');
  }
  const { nodeId, resolution } = verdict as { nodeId?: unknown; resolution?: unknown };
  if (typeof nodeId !== 'string' || nodeId.length === 0) {
    throw malformed('nodeId must be a non-empty string');
  }
  if (typeof resolution !== 'object' || resolution === null || !('output' in resolution)) {
    throw malformed('resolution must be an object carrying output');
  }
  for (const key of Object.keys(resolution)) {
    if (key !== 'output' && key !== 'nextPort') {
      throw malformed(`Unknown resolution key "${key}"`);
    }
  }
  const { nextPort } = resolution as { nextPort?: unknown };
  if (nextPort !== undefined && (typeof nextPort !== 'string' || nextPort.length === 0 || nextPort === 'errorRoute')) {
    throw malformed('nextPort must be a non-empty string other than the reserved errorRoute');
  }
  if (!knownNodes.has(nodeId)) {
    throw ApplicationFailure.nonRetryable(`No node "${nodeId}" in this run`, 'verdict_for_unknown_node');
  }
  const state = waits.get(nodeId);
  if (state?.status === 'resolved') {
    throw ApplicationFailure.nonRetryable(`Node "${nodeId}" already has a verdict`, 'verdict_already_delivered');
  }
  if (state === undefined) {
    throw ApplicationFailure.nonRetryable(`Node "${nodeId}" is not waiting for a verdict`, 'node_not_waiting');
  }
}

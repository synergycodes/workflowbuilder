import type {
  ExecutionErrorPayload,
  NodeCompletedPayload,
  NodeStartedPayload,
} from '@workflow-builder/types/workflow-execution/execution-events';

// The minimal slice of an execution event the reconstruction needs — structural, so
// it accepts DB rows, SSE messages, and test fixtures alike.
export type NodeInputEventSource = {
  type: string;
  nodeId?: string | null;
  payload?: unknown;
};

export type ReconstructedNodeInputs = {
  config: unknown;
  nodeOutputs: Record<string, unknown>;
};

// Rebuilds what a node was given at start from the execution's event history.
// `node_started` records `{ config, visibleNodeIds }`; every visible output is
// recorded exactly once at a lower sequence — as `node_completed.output`, or as
// `node_failed.error` for a failure absorbed by errorPolicy 'continue'/'errorRoute'
// (the runner stores absorbed errors in `nodeOutputs` as `{ error }`, the same shape
// the event carries). Returns undefined when the node has no recorded payload
// (events written before inputs were captured, or a node that never started).
export function reconstructNodeInputs(
  events: readonly NodeInputEventSource[],
  nodeId: string,
): ReconstructedNodeInputs | undefined {
  const started = events.find((event) => event.type === 'node_started' && event.nodeId === nodeId);
  const payload = started?.payload as NodeStartedPayload | undefined;
  if (!payload || !Array.isArray(payload.visibleNodeIds)) return undefined;

  const nodeOutputs: Record<string, unknown> = {};
  for (const visibleId of payload.visibleNodeIds) {
    const completed = events.find((event) => event.type === 'node_completed' && event.nodeId === visibleId);
    if (completed) {
      nodeOutputs[visibleId] = (completed.payload as NodeCompletedPayload).output;
      continue;
    }
    const failed = events.find((event) => event.type === 'node_failed' && event.nodeId === visibleId);
    if (failed) {
      nodeOutputs[visibleId] = { error: (failed.payload as ExecutionErrorPayload).error };
    }
  }
  return { config: payload.config, nodeOutputs };
}

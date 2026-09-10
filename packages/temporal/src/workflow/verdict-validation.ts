import { ApplicationFailure } from '@temporalio/workflow';

import type { CompletedNodeExecution, VerdictRejection } from './core-contract';

// A node's wait lifecycle; no entry means the node is not waiting.
export type NodeWaitState = { status: 'waiting' } | { status: 'resolved'; resolution: CompletedNodeExecution };

// Every way a verdict is refused before acceptance: the port's code and the one message
// for it. `{value}` is the single interpolation slot, as in the backend's dictionaries.
const VERDICT_REJECTIONS = {
  not_an_object: { code: 'verdict_malformed', message: 'update input must be a { nodeId, resolution } object' },
  node_id_blank: { code: 'verdict_malformed', message: 'nodeId must be a non-empty string' },
  resolution_not_an_object: { code: 'verdict_malformed', message: 'resolution must be an object' },
  unknown_resolution_key: { code: 'verdict_malformed', message: "unknown resolution key '{value}'" },
  next_port_invalid: {
    code: 'verdict_malformed',
    message: "nextPort must be a non-empty string other than the reserved 'errorRoute'",
  },
  unknown_node: { code: 'verdict_for_unknown_node', message: "no node '{value}' in this run" },
  already_delivered: { code: 'verdict_already_delivered', message: "node '{value}' already has a verdict" },
  not_waiting: { code: 'node_not_waiting', message: "node '{value}' is not waiting for a verdict" },
} as const satisfies Record<string, { code: VerdictRejection; message: string }>;

function reject(key: keyof typeof VERDICT_REJECTIONS, value?: string): ApplicationFailure {
  const { code, message } = VERDICT_REJECTIONS[key];
  // A function replacer, so a value containing `$&` or `$1` lands verbatim.
  return ApplicationFailure.nonRetryable(
    message.replace('{value}', () => value ?? ''),
    code,
  );
}

// Runs before the update is accepted: a throw rejects it, writes nothing to history
// and cannot fail the workflow task. Engine integrity only (durable-pause.decision-log.md).
export function validateVerdict(
  verdict: unknown,
  knownNodes: ReadonlySet<string>,
  waits: ReadonlyMap<string, NodeWaitState>,
): void {
  if (typeof verdict !== 'object' || verdict === null) {
    throw reject('not_an_object');
  }
  const { nodeId, resolution } = verdict as { nodeId?: unknown; resolution?: unknown };
  if (typeof nodeId !== 'string' || nodeId.length === 0) {
    throw reject('node_id_blank');
  }
  // No `output` key is accepted as `output: undefined`: the default payload converter
  // is JSON and drops undefined fields before the update reaches the workflow.
  if (typeof resolution !== 'object' || resolution === null || Array.isArray(resolution)) {
    throw reject('resolution_not_an_object');
  }
  for (const key of Object.keys(resolution)) {
    if (key !== 'output' && key !== 'nextPort') {
      throw reject('unknown_resolution_key', key);
    }
  }
  const { nextPort } = resolution as { nextPort?: unknown };
  if (nextPort !== undefined && (typeof nextPort !== 'string' || nextPort.length === 0 || nextPort === 'errorRoute')) {
    throw reject('next_port_invalid');
  }
  if (!knownNodes.has(nodeId)) {
    throw reject('unknown_node', nodeId);
  }
  const state = waits.get(nodeId);
  if (state?.status === 'resolved') {
    throw reject('already_delivered', nodeId);
  }
  if (state === undefined) {
    throw reject('not_waiting', nodeId);
  }
}

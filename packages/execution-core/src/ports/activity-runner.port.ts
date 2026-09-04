import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

import type { ExecutionContext } from '../execution-context';

export type CompletedNodeExecution = {
  output: unknown;
  // Naming a port promises a live route: if no outgoing edge goes live for it, the run
  // ends incomplete with `{ nodeId, port }`. Falsy ('' or a smuggled null) means "no
  // port", mirroring the router. 'errorRoute' is reserved for the error policy.
  nextPort?: string;
  // Never present — discriminates the union, so `result.waiting` narrows both sides.
  waiting?: never;
};

// A parked node: the runner keeps the wave slot open and awaits `awaitResolution`.
// On an adapter without that port, a waiting result fails the whole run instead.
export type WaitingNodeExecution = {
  waiting: true;
};

export type NodeExecutionResult = CompletedNodeExecution | WaitingNodeExecution;

// Graph runner calls this to execute a single node's activity.
// Temporal adapter wraps proxyActivities; in-memory adapter calls the executor directly.
export interface ActivityRunnerPort<TNode extends BaseNode> {
  executeNode(node: TNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  // Optional — engines without gate support omit it. Parks the caller until the
  // verdict for `nodeId` arrives, resolving with the completion the verdict carries.
  awaitResolution?(nodeId: string): Promise<CompletedNodeExecution>;
}

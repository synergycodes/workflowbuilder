import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

import type { ExecutionContext } from '../execution-context';

export type CompletedNodeExecution = {
  output: unknown;
  // Naming a port promises a live route: if no outgoing edge goes live for it, the run
  // ends incomplete with `{ nodeId, port }`. Falsy ('' or a smuggled null) means "no
  // port", mirroring the router. 'errorRoute' is reserved for the error policy.
  nextPort?: string;
  // Never present — discriminates the union.
  waiting?: never;
};

export type WaitingNodeExecution = {
  waiting: true;
};

export type NodeExecutionResult = CompletedNodeExecution | WaitingNodeExecution;

// Graph runner calls this to execute a single node's activity.
// Temporal adapter wraps proxyActivities; in-memory adapter calls the executor directly.
export interface ActivityRunnerPort<TNode extends BaseNode> {
  executeNode(node: TNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  // Resolves with the verdict's completion. Engines without gate support omit it;
  // a waiting result then fails the run.
  awaitResolution?(nodeId: string): Promise<CompletedNodeExecution>;
}

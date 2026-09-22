import type { ExecutionOutcome } from '@workflow-builder/types/workflow-execution/execution-events';
import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

import type { ExecutionContext } from '../execution-context';

export type CompletedNodeExecution = {
  output: unknown;
  // Naming a port promises a live route: no live edge for it ends the run incomplete with
  // `{ nodeId, port }`, unless `outcome` is set. Falsy ('' or a smuggled null) means "no
  // port", mirroring the router. 'errorRoute' is reserved for the error policy.
  nextPort?: string;
  // A run-level result this completion declares; the run keeps the first one declared. Its port
  // may then light no edge: a deliberate end, not a dead end. An object with non-blank `value`
  // and `resolvedBy`; anything else counts as none.
  outcome?: ExecutionOutcome;
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
  // a waiting result then fails the run. Must record the wait before its first await;
  // the runner announces it only afterwards.
  awaitResolution?(nodeId: string): Promise<CompletedNodeExecution>;
}

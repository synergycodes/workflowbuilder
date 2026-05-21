import type {
  BaseNode,
  NodeErrorPolicy,
  WorkflowEdgeDefinition,
} from '@workflow-builder/types/workflow-execution/execution-model';

import { NodeExecutionError } from './errors';
import type { ExecutionContext } from './execution-context';
import type { ActivityRunnerPort } from './ports/activity-runner.port';
import type { EventEmitterPort } from './ports/event-emitter.port';
import type { WorkflowExecutionInput } from './ports/workflow-engine.port';

// `sourceHandle` reserved for the 'errorRoute' error policy. Edges tagged
// with this value fire ONLY when the upstream node failed with policy
// 'errorRoute' (which sets the propagation nextPort to this value). Every other
// propagation path — success, 'continue' on error, decision branching,
// skip — prunes them, so a dangling error branch never fires unless
// someone explicitly opted into error routing. The handle name matches the
// policy literal so the wiring reads consistently from schema to runner.
const RESERVED_ERROR_HANDLE = 'errorRoute';

// Topological scheduler. A node becomes ready only when ALL of its incoming
// edges are resolved (predecessor either completed via a live route, or was
// pruned by a decision node's nextPort). Ready nodes within the same wave
// run concurrently via Promise.all. Failure in any wave aborts the graph.
//
// The runner intentionally takes no logger. It is re-exported from the
// sandbox-safe entry (`./workflow`) and therefore runs inside Temporal's
// V8 workflow context, where every call to `new Date()`, `Math.random()`,
// or other non-deterministic source poisons history replay. Lifecycle
// signals (execution_started/completed/failed, node_started/completed/failed)
// already flow through EventEmitterPort — operators tail those for run-time
// observability. Activity executors that need real-time logs (LLM failures,
// HTTP retries) hold their own LoggerPort outside the sandbox.
export async function runGraph<TNode extends BaseNode>(
  input: WorkflowExecutionInput<TNode>,
  runner: ActivityRunnerPort<TNode>,
  events: EventEmitterPort,
): Promise<void> {
  const adjacency = buildAdjacencyMap(input.definition.nodes, input.definition.edges);
  const inDegree = computeInDegrees(input.definition.nodes, input.definition.edges);

  const entrypoints = input.definition.nodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0);
  if (entrypoints.length === 0) {
    throw new Error('Workflow has no entrypoint node');
  }

  await events.emitEvent(input.executionId, 'execution_started', { workflowId: input.workflowId });

  // pendingPredecessors counts incoming edges not yet resolved (completed OR pruned).
  // liveIncoming counts incoming edges that resolved via a non-pruned route.
  // A node becomes ready when pending hits 0 AND liveIncoming > 0;
  // it's marked 'skipped' (and skip propagates downstream) when pending hits 0 with liveIncoming = 0.
  const state: SchedulerState<TNode> = {
    adjacency,
    pendingPredecessors: new Map(inDegree),
    liveIncoming: new Map(input.definition.nodes.map((node) => [node.id, 0])),
    status: new Map(input.definition.nodes.map((node) => [node.id, 'pending'])),
  };

  let ready: TNode[] = entrypoints;
  const nodeOutputs: Record<string, unknown> = {};

  while (ready.length > 0) {
    const context: ExecutionContext = {
      workflowId: input.workflowId,
      executionId: input.executionId,
      triggerPayload: input.triggerPayload,
      nodeOutputs: { ...nodeOutputs },
      variables: input.variables,
      global: input.global,
    };

    const results = await Promise.all(ready.map((node) => runNode(node, context, runner, events, input.executionId)));

    // Fatal failures (policy 'fail') abort the whole execution — pick the first
    // one in deterministic node order, just like the previous behavior.
    const fatal = results.find((r) => r.failed && resolveErrorPolicy(r.node) === 'fail');
    if (fatal && fatal.failed) {
      await events.emitEvent(input.executionId, 'execution_failed', { error: { message: fatal.message } });
      await events.updateStatus(input.executionId, 'failed', fatal.message);
      return;
    }

    const newlyReady: TNode[] = [];
    for (const result of results) {
      if (result.failed) {
        // 'continue' and 'errorRoute' absorb the error into nodeOutputs so downstream
        // nodes can inspect it via the standard `{{ nodes.<id>.output }}` path.
        const policy = resolveErrorPolicy(result.node);
        const errorOutput =
          result.code === undefined
            ? { error: { message: result.message } }
            : { error: { message: result.message, code: result.code } };
        nodeOutputs[result.node.id] = errorOutput;
        state.status.set(result.node.id, 'completed');
        const nextPort = policy === 'errorRoute' ? RESERVED_ERROR_HANDLE : undefined;
        propagate(result.node.id, nextPort, true, state, newlyReady);
        continue;
      }
      nodeOutputs[result.node.id] = result.output;
      state.status.set(result.node.id, 'completed');
      propagate(result.node.id, result.nextPort, true, state, newlyReady);
    }

    ready = newlyReady;
  }

  // Sanity check: any node still 'pending' with unresolved predecessors never became reachable.
  // Catches cycles reachable from an entrypoint and dangling-edge bugs that would otherwise
  // surface as a successful completion with parts of the graph never run.
  const stalled: string[] = [];
  for (const [id, pending] of state.pendingPredecessors) {
    if (pending > 0 && state.status.get(id) === 'pending') stalled.push(id);
  }
  if (stalled.length > 0) {
    const message = `Workflow stalled: nodes never became ready: ${stalled.join(', ')}`;
    await events.emitEvent(input.executionId, 'execution_failed', { error: { message } });
    await events.updateStatus(input.executionId, 'failed', message);
    return;
  }

  await events.emitEvent(input.executionId, 'execution_completed');
  await events.updateStatus(input.executionId, 'completed');
}

type NodeStatus = 'pending' | 'completed' | 'skipped';

type SchedulerState<TNode extends BaseNode> = {
  adjacency: Map<string, AdjacencyEntry<TNode>[]>;
  pendingPredecessors: Map<string, number>;
  liveIncoming: Map<string, number>;
  status: Map<string, NodeStatus>;
};

// Resolves all outgoing edges from `rootId`. For each successor, decrements its
// pending counter, increments live counter if the edge is alive (no decision
// pruning, or sourceHandle matches the decision's nextPort). When pending hits
// 0, the successor either becomes ready or is marked skipped — and skip walks
// through its own outgoing edges via the same queue, so unreachable subtrees
// don't stall downstream join points and deep dead-branch chains can't blow the
// call stack.
function propagate<TNode extends BaseNode>(
  rootId: string,
  rootNextPort: string | undefined,
  rootSourceLive: boolean,
  state: SchedulerState<TNode>,
  out: TNode[],
): void {
  const queue: { fromId: string; nextPort: string | undefined; sourceLive: boolean }[] = [
    { fromId: rootId, nextPort: rootNextPort, sourceLive: rootSourceLive },
  ];
  while (queue.length > 0) {
    const { fromId, nextPort, sourceLive } = queue.shift()!;
    const successors = state.adjacency.get(fromId) ?? [];
    for (const { node: target, sourceHandle } of successors) {
      const edgeLive = isEdgeLive(sourceLive, nextPort, sourceHandle);
      state.pendingPredecessors.set(target.id, (state.pendingPredecessors.get(target.id) ?? 0) - 1);
      if (edgeLive) {
        state.liveIncoming.set(target.id, (state.liveIncoming.get(target.id) ?? 0) + 1);
      }

      if ((state.pendingPredecessors.get(target.id) ?? 0) === 0 && state.status.get(target.id) === 'pending') {
        if ((state.liveIncoming.get(target.id) ?? 0) > 0) {
          out.push(target);
        } else {
          state.status.set(target.id, 'skipped');
          queue.push({ fromId: target.id, nextPort: undefined, sourceLive: false });
        }
      }
    }
  }
}

type NodeRunResult<TNode extends BaseNode> =
  | { node: TNode; output: unknown; nextPort?: string; failed: false }
  | { node: TNode; message: string; code?: string; failed: true };

async function runNode<TNode extends BaseNode>(
  node: TNode,
  context: ExecutionContext,
  runner: ActivityRunnerPort<TNode>,
  events: EventEmitterPort,
  executionId: string,
): Promise<NodeRunResult<TNode>> {
  await events.emitEvent(executionId, 'node_started', undefined, node.id);

  try {
    const result = await runner.executeNode(node, context);
    await events.emitEvent(executionId, 'node_completed', { output: result.output }, node.id);
    return { node, output: result.output, nextPort: result.nextPort, failed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof NodeExecutionError ? error.code : undefined;
    const errorPayload = code === undefined ? { message } : { message, code };
    await events.emitEvent(executionId, 'node_failed', { error: errorPayload }, node.id);
    return { node, message, code, failed: true };
  }
}

function resolveErrorPolicy(node: BaseNode): NodeErrorPolicy {
  return node.errorPolicy ?? 'fail';
}

// Edge liveness rules:
// - Dead upstream prunes everything (skip propagation).
// - Error routing (`nextPort === RESERVED_ERROR_HANDLE`) fires only the
//   matching error edges; every other outgoing edge is pruned.
// - Otherwise (success, `continue`, decision branches): error edges are
//   pruned, and a non-error edge fires when it has no `sourceHandle` set
//   or when its handle matches `nextPort` (decision-style routing).
function isEdgeLive(sourceLive: boolean, nextPort: string | undefined, sourceHandle: string | undefined): boolean {
  if (!sourceLive) return false;
  const isErrorEdge = sourceHandle === RESERVED_ERROR_HANDLE;
  const isErrorRouting = nextPort === RESERVED_ERROR_HANDLE;
  if (isErrorRouting) return isErrorEdge;
  if (isErrorEdge) return false;
  return !nextPort || sourceHandle === nextPort;
}

type AdjacencyEntry<TNode extends BaseNode> = {
  node: TNode;
  sourceHandle: string | undefined;
};

function buildAdjacencyMap<TNode extends BaseNode>(
  nodes: TNode[],
  edges: WorkflowEdgeDefinition[],
): Map<string, AdjacencyEntry<TNode>[]> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, AdjacencyEntry<TNode>[]>();

  for (const edge of edges) {
    const targetNode = nodeMap.get(edge.targetNodeId);
    if (!targetNode) continue;

    const list = adjacency.get(edge.sourceNodeId) ?? [];
    list.push({ node: targetNode, sourceHandle: edge.sourceHandle });
    adjacency.set(edge.sourceNodeId, list);
  }

  return adjacency;
}

function computeInDegrees<TNode extends BaseNode>(
  nodes: TNode[],
  edges: WorkflowEdgeDefinition[],
): Map<string, number> {
  const inDegree = new Map<string, number>();
  for (const node of nodes) inDegree.set(node.id, 0);
  for (const edge of edges) {
    if (inDegree.has(edge.targetNodeId)) {
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
    }
  }
  return inDegree;
}

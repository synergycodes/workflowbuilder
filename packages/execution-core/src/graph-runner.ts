import type {
  DeadEnd,
  ExecutionErrorPayload,
  NodeSkipReason,
} from '@workflow-builder/types/workflow-execution/execution-events';
import type {
  BaseNode,
  NodeErrorPolicy,
  WorkflowEdgeDefinition,
} from '@workflow-builder/types/workflow-execution/execution-model';

import { extractDeepestError } from './errors';
import type { ExecutionContext } from './execution-context';
import type { ActivityRunnerPort } from './ports/activity-runner.port';
import type { EventEmitterPort } from './ports/event-emitter.port';
import type { WorkflowExecutionInput } from './ports/workflow-engine.port';
import { withRedactedPayloads } from './redact';
import { resolveStartNode } from './resolve-start-node';

// `sourceHandle` reserved for the 'errorRoute' error policy. Edges tagged
// with this value fire ONLY when the upstream node failed with policy
// 'errorRoute' (which sets the propagation nextPort to this value). Every other
// propagation path — success, 'continue' on error, decision branching,
// skip — prunes them, so a dangling error branch never fires unless
// someone explicitly opted into error routing. The handle name matches the
// policy literal so the wiring reads consistently from schema to runner.
const RESERVED_ERROR_HANDLE = 'errorRoute';

// How the run ended. Returned rather than thrown so `runGraph` stays engine-agnostic:
// each engine adapter decides how an outcome maps onto its own vocabulary (the
// Temporal adapter raises an ApplicationFailure for 'failed' so the Workflow Execution
// shows as Failed rather than Completed; 'incomplete' closes normally, since nothing
// went wrong). Note a node failing under errorPolicy 'continue' is absorbed by the graph
// and still yields `{ status: 'completed' }` — only an unhandled node failure, a stall,
// or a malformed start (missing, duplicated, or with orphaned nodes alongside it) fails
// the run. 'incomplete' means every route the graph took was followed to its end, but at
// least one of them led nowhere — see `deadEnds`.
export type RunGraphOutcome =
  | { status: 'completed' }
  | { status: 'incomplete'; deadEnds: DeadEnd[] }
  | { status: 'failed'; error: { message: string; code?: string } };

// Topological scheduler. A node becomes ready only when ALL of its incoming
// edges are resolved (predecessor either completed via a live route, or was
// pruned by a decision node's nextPort). Ready nodes within the same wave
// run concurrently via Promise.all. Failure in any wave aborts the graph.
//
// The runner intentionally takes no logger. It is re-exported from the
// sandbox-safe entry (`./workflow`) and therefore runs inside Temporal's
// V8 workflow context, where every call to `new Date()`, `Math.random()`,
// or other non-deterministic source poisons history replay. Lifecycle
// signals (execution_started/completed/incomplete/failed, node_started/completed/failed,
// node_skipped) already flow through EventEmitterPort — operators tail those for run-time
// observability. Activity executors that need real-time logs (LLM failures,
// HTTP retries) hold their own LoggerPort outside the sandbox.
export async function runGraph<TNode extends BaseNode>(
  input: WorkflowExecutionInput<TNode>,
  runner: ActivityRunnerPort<TNode>,
  rawEvents: EventEmitterPort,
): Promise<RunGraphOutcome> {
  // Every payload is redacted before it crosses the emit boundary — event history
  // (DB, SSE, Temporal's own history via activity args) is immutable, so secrets
  // must never reach it in the first place.
  const events = withRedactedPayloads(rawEvents);

  const adjacency = buildAdjacencyMap(input.definition.nodes, input.definition.edges);
  const inDegree = computeInDegrees(input.definition.nodes, input.definition.edges);

  await events.emitEvent(input.executionId, 'execution_started', { workflowId: input.workflowId });

  const entry = resolveStartNode(input.definition.nodes, inDegree);
  if ('error' in entry) {
    return await failExecution(input.executionId, events, { message: entry.error });
  }
  const startNode = entry.startNode;

  // pendingPredecessors counts incoming edges not yet resolved (completed OR pruned).
  // liveIncoming counts incoming edges that resolved via a non-pruned route.
  // A node becomes ready when pending hits 0 AND liveIncoming > 0;
  // it's marked 'skipped' (and skip propagates downstream) when pending hits 0 with liveIncoming = 0.
  const state: SchedulerState<TNode> = {
    adjacency,
    pendingPredecessors: new Map(inDegree),
    liveIncoming: new Map(input.definition.nodes.map((node) => [node.id, 0])),
    status: new Map(input.definition.nodes.map((node) => [node.id, 'pending'])),
    livePruneKind: new Map(),
  };

  let ready: TNode[] = [startNode];
  const nodeOutputs: Record<string, unknown> = {};
  const deadEnds: DeadEnd[] = [];

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
    // one in deterministic node order, just like the previous behavior. The abort
    // itself waits until the wave has propagated and emitted its skips: siblings
    // that resolved in this same wave still owe their `node_skipped` events, and
    // `execution_failed` has to stay the last event of the run.
    // A runner-level abort (`r.abort`) is fatal regardless of the node's policy.
    const fatal = results.find((r) => r.failed && (r.abort === true || resolveErrorPolicy(r.node) === 'fail'));

    const newlyReady: TNode[] = [];
    const skipped: SkippedNode[] = [];
    for (const result of results) {
      if (result.failed) {
        const policy = resolveErrorPolicy(result.node);
        // A fatal node resolves nothing — no output, no propagation — so its
        // successors keep their pending predecessor count and emit no event.
        // Never reached is a different state from deliberately skipped.
        if (result.abort === true || policy === 'fail') continue;
        // 'continue' and 'errorRoute' absorb the error into nodeOutputs so downstream
        // nodes can inspect it via the standard `{{ nodes.<id>.output }}` path.
        const errorOutput =
          result.code === undefined
            ? { error: { message: result.message } }
            : { error: { message: result.message, code: result.code } };
        nodeOutputs[result.node.id] = errorOutput;
        state.status.set(result.node.id, 'completed');
        const nextPort = policy === 'errorRoute' ? RESERVED_ERROR_HANDLE : undefined;
        const deadEnd = propagate(result.node.id, nextPort, true, state, newlyReady, skipped);
        if (deadEnd) deadEnds.push(deadEnd);
        continue;
      }
      nodeOutputs[result.node.id] = result.output;
      state.status.set(result.node.id, 'completed');
      const deadEnd = propagate(result.node.id, result.nextPort, true, state, newlyReady, skipped);
      if (deadEnd) deadEnds.push(deadEnd);
    }

    // Emitted once the whole wave has propagated, so a skip reads as a consequence of
    // the wave that pruned it rather than arriving mid-wave. Order is a pure function of
    // the definition: `results` follows `ready`, which follows `definition.nodes`, and
    // `propagate` walks the dead subtree breadth-first from there — nothing wall-clock or
    // completion-order dependent, so a replay reproduces it. An exhausted `emitEvent` is
    // swallowed rather than failing the run: the event is advisory, so a node that was
    // never going to execute must not be able to abort a run that is otherwise healthy.
    for (const node of skipped) {
      try {
        await events.emitEvent(input.executionId, 'node_skipped', { reason: node.reason }, node.id);
      } catch {
        // Swallowed on purpose — see above. Nothing is logged: this runs inside the
        // Temporal workflow sandbox, which has no LoggerPort.
      }
    }

    if (fatal && fatal.failed) {
      return await failExecution(input.executionId, events, { message: fatal.message, code: fatal.code });
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
    return await failExecution(input.executionId, events, { message });
  }

  if (deadEnds.length > 0) {
    await events.emitEvent(input.executionId, 'execution_incomplete', { deadEnds });
    await events.updateStatus(input.executionId, 'incomplete');
    return { status: 'incomplete', deadEnds };
  }

  await events.emitEvent(input.executionId, 'execution_completed');
  await events.updateStatus(input.executionId, 'completed');
  return { status: 'completed' };
}

// Emits the terminal failure signals and shapes the outcome. Every failure path routes
// through here so the event, the engine status, and the returned outcome can never drift.
async function failExecution(
  executionId: string,
  events: EventEmitterPort,
  error: { message: string; code?: string },
): Promise<RunGraphOutcome> {
  const payload = error.code === undefined ? { message: error.message } : { message: error.message, code: error.code };
  await events.emitEvent(executionId, 'execution_failed', { error: payload });
  await events.updateStatus(executionId, 'failed', error.message);
  return { status: 'failed', error: payload };
}

type NodeStatus = 'pending' | 'completed' | 'skipped';

type SchedulerState<TNode extends BaseNode> = {
  adjacency: Map<string, AdjacencyEntry<TNode>[]>;
  pendingPredecessors: Map<string, number>;
  liveIncoming: Map<string, number>;
  status: Map<string, NodeStatus>;
  // Nodes with at least one incoming edge pruned while its source was live — an upstream
  // node ran and routed elsewhere. Separates the head of a dead branch from the rest of it
  // when reporting why a node was skipped, and distinguishes a dormant error branch
  // ('error') from one something actively routed away from ('branch').
  //
  // Not a flag overwritten by the last edge resolved: the reason must not depend on the
  // order a node's predecessors resolve in. 'branch' outranks 'error' and is never
  // overwritten, so the recorded kind is a pure function of the set of prunings.
  livePruneKind: Map<string, LivePruneKind>;
};

// How an incoming edge died while its source was still live. 'error' — the edge is
// reserved for error routing and the source never error-routed. 'branch' — anything
// else: a decision picked another handle, or an error-routing source pruned a
// regular branch.
type LivePruneKind = 'branch' | 'error';

type SkippedNode = { id: string; reason: NodeSkipReason };

// Resolves all outgoing edges from `rootId`. For each successor, decrements its
// pending counter, increments live counter if the edge is alive (no decision
// pruning, or sourceHandle matches the decision's nextPort). When pending hits
// 0, the successor either becomes ready or is marked skipped — and skip walks
// through its own outgoing edges via the same queue, so unreachable subtrees
// don't stall downstream join points and deep dead-branch chains can't blow the
// call stack.
//
// Newly ready nodes land in `out`, newly skipped ones in `skippedOut`; both are
// appended in traversal order and neither is emitted from here, so the caller keeps
// control of event ordering. The return value is a single post-loop verdict about the
// root — it named a port and nothing went live through it — or `undefined`.
function propagate<TNode extends BaseNode>(
  rootId: string,
  rootNextPort: string | undefined,
  rootSourceLive: boolean,
  state: SchedulerState<TNode>,
  out: TNode[],
  skippedOut: SkippedNode[],
): DeadEnd | undefined {
  // Root liveness is static — adjacency never mutates and isEdgeLive reads no
  // scheduler state — so it is computed upfront rather than tracked in the loop.
  const rootRoutedSomewhere = (state.adjacency.get(rootId) ?? []).some(({ sourceHandle }) =>
    isEdgeLive(rootSourceLive, rootNextPort, sourceHandle),
  );

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
      } else if (sourceLive) {
        const kind: LivePruneKind = sourceHandle === RESERVED_ERROR_HANDLE ? 'error' : 'branch';
        if (state.livePruneKind.get(target.id) !== 'branch') {
          state.livePruneKind.set(target.id, kind);
        }
      }

      if ((state.pendingPredecessors.get(target.id) ?? 0) === 0 && state.status.get(target.id) === 'pending') {
        if ((state.liveIncoming.get(target.id) ?? 0) > 0) {
          out.push(target);
        } else {
          state.status.set(target.id, 'skipped');
          skippedOut.push({ id: target.id, reason: skipReason(state.livePruneKind.get(target.id)) });
          queue.push({ fromId: target.id, nextPort: undefined, sourceLive: false });
        }
      }
    }
  }

  // A node that named a port but reached nothing through it. Only a non-empty port
  // counts — truthiness, to mirror `isEdgeLive`'s `!nextPort`: config arrives
  // unvalidated, and a falsy port ('' or a smuggled null) routes as "no port" there,
  // so it must not read as a promised route here.
  if (rootNextPort && !rootRoutedSomewhere) {
    return { nodeId: rootId, port: rootNextPort };
  }
  return undefined;
}

function skipReason(kind: LivePruneKind | undefined): NodeSkipReason {
  if (kind === undefined) {
    return 'upstream_skipped';
  }

  return kind === 'error' ? 'error_route_not_taken' : 'branch_not_taken';
}

type NodeRunResult<TNode extends BaseNode> =
  | { node: TNode; output: unknown; nextPort?: string; failed: false }
  // `abort` marks a runner-level abort that outranks the node's own errorPolicy.
  | { node: TNode; message: string; code?: string; failed: true; abort?: true };

async function runNode<TNode extends BaseNode>(
  node: TNode,
  context: ExecutionContext,
  runner: ActivityRunnerPort<TNode>,
  events: EventEmitterPort,
  executionId: string,
): Promise<NodeRunResult<TNode>> {
  try {
    const visibleNodeIds = Object.keys(context.nodeOutputs);
    await events.emitEvent(executionId, 'node_started', { config: node.config, visibleNodeIds }, node.id);
    const result = await runner.executeNode(node, context);
    if (result.waiting) {
      // A runner-level abort, not a node failure: routed around `errorPolicy`, where
      // 'continue' would close the run as completed with the gate silently skipped.
      return {
        node,
        message: `Node "${node.id}" returned a waiting result, but this engine adapter does not support gates`,
        failed: true,
        abort: true,
      };
    }
    await events.emitEvent(executionId, 'node_completed', { output: result.output }, node.id);
    return { node, output: result.output, nextPort: result.nextPort, failed: false };
  } catch (error) {
    const { message, code, attempt } = extractDeepestError(error);
    const errorPayload: ExecutionErrorPayload['error'] = { message };
    if (code !== undefined) errorPayload.code = code;
    if (attempt !== undefined) errorPayload.attempt = attempt;
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

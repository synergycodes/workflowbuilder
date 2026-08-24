import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import type {
  BaseNode,
  NodeErrorPolicy,
  WorkflowDefinition,
  WorkflowEdgeDefinition,
} from '@workflow-builder/types/workflow-execution/execution-model';

import { NodeExecutionError } from './errors';
import { runGraph } from './graph-runner';
import type { ActivityRunnerPort } from './ports/activity-runner.port';
import type { EventEmitterPort } from './ports/event-emitter.port';
import type { WorkflowExecutionInput } from './ports/workflow-engine.port';

// Generic test node — graph-runner is product-agnostic, so the test stays
// agnostic too. `type` and `config` are carried through but never read.
type TestNode = BaseNode & { type: 'test/node' };

// ---- helpers ----------------------------------------------------------------

type NodeBehavior = {
  output?: unknown;
  nextPort?: string;
  throws?: string;
};

function makeRunner(behaviors: Record<string, NodeBehavior> = {}): {
  port: ActivityRunnerPort<TestNode>;
  callOrder: string[];
  contexts: Record<string, Record<string, unknown>>;
} {
  const callOrder: string[] = [];
  const contexts: Record<string, Record<string, unknown>> = {};
  return {
    callOrder,
    contexts,
    port: {
      async executeNode(node, context) {
        callOrder.push(node.id);
        contexts[node.id] = { ...context.nodeOutputs };
        const b = behaviors[node.id];
        if (b?.throws) throw new Error(b.throws);
        return { output: b?.output ?? `out-${node.id}`, nextPort: b?.nextPort };
      },
    },
  };
}

type EventCall = { type: string; nodeId?: string; payload?: unknown };
type StatusCall = { status: string; errorMessage?: string };

type EmitFailure = { type: string; nodeId?: string; message: string };

function makeEvents(failOn?: EmitFailure): {
  port: EventEmitterPort;
  events: EventCall[];
  statuses: StatusCall[];
} {
  const events: EventCall[] = [];
  const statuses: StatusCall[] = [];
  return {
    events,
    statuses,
    port: {
      async emitEvent(_executionId, type, payload, nodeId) {
        events.push({ type, nodeId, payload });
        if (failOn && failOn.type === type && failOn.nodeId === nodeId) {
          throw new Error(failOn.message);
        }
      },
      async updateStatus(_executionId, status, errorMessage) {
        statuses.push({ status, errorMessage });
      },
    },
  };
}

function trigger(id: string, errorPolicy?: NodeErrorPolicy): TestNode {
  return errorPolicy === undefined
    ? { id, type: 'test/node', config: {} }
    : { id, type: 'test/node', config: {}, errorPolicy };
}

function start(id: string, errorPolicy?: NodeErrorPolicy): TestNode {
  return errorPolicy === undefined
    ? { id, type: 'test/node', config: {}, role: 'start' }
    : { id, type: 'test/node', config: {}, role: 'start', errorPolicy };
}

function edge(id: string, source: string, target: string, sourceHandle?: string): WorkflowEdgeDefinition {
  return { id, sourceNodeId: source, targetNodeId: target, sourceHandle };
}

function skipsFrom(events: EventCall[]): { nodeId: string | undefined; reason: unknown }[] {
  return events
    .filter((event) => event.type === 'node_skipped')
    .map((event) => ({ nodeId: event.nodeId, reason: (event.payload as { reason: string }).reason }));
}

function makeInput(nodes: TestNode[], edges: WorkflowEdgeDefinition[]): WorkflowExecutionInput<TestNode> {
  const definition: WorkflowDefinition<TestNode> = { workflowId: 'wf-1', nodes, edges };
  return {
    workflowId: 'wf-1',
    executionId: 'exec-1',
    definition,
    triggerPayload: {},
    variables: {},
    global: {},
  };
}

// ---- tests ------------------------------------------------------------------

describe('runGraph — topological scheduling', () => {
  it('linear A→B→C runs in order, propagates outputs', async () => {
    const runner = makeRunner({
      A: { output: 'a-result' },
      B: { output: 'b-result' },
    });
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput([start('A'), trigger('B'), trigger('C')], [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')]),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['A', 'B', 'C']);
    expect(runner.contexts.B).toEqual({ A: 'a-result' });
    expect(runner.contexts.C).toEqual({ A: 'a-result', B: 'b-result' });
    expect(events.statuses.at(-1)).toEqual({ status: 'completed', errorMessage: undefined });
    expect(outcome).toEqual({ status: 'completed' });
  });

  it('fan-out A→{B,C} runs B and C in same wave', async () => {
    const runner = makeRunner();
    const events = makeEvents();

    await runGraph(
      makeInput([start('A'), trigger('B'), trigger('C')], [edge('e1', 'A', 'B'), edge('e2', 'A', 'C')]),
      runner.port,
      events.port,
    );

    // A first; B and C concurrent so order between them isn't fixed, but both
    // see A's output and neither sees the other's
    expect(runner.callOrder[0]).toBe('A');
    expect(runner.callOrder.slice(1).sort()).toEqual(['B', 'C']);
    expect(runner.contexts.B).toEqual({ A: 'out-A' });
    expect(runner.contexts.C).toEqual({ A: 'out-A' });
  });

  it('diamond A→{B,C}→D — D runs after BOTH B and C with both outputs visible', async () => {
    const runner = makeRunner();
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('A'), trigger('B'), trigger('C'), trigger('D')],
        [edge('e1', 'A', 'B'), edge('e2', 'A', 'C'), edge('e3', 'B', 'D'), edge('e4', 'C', 'D')],
      ),
      runner.port,
      events.port,
    );

    // D is the last to execute and sees both B and C in its context
    expect(runner.callOrder.at(-1)).toBe('D');
    expect(runner.contexts.D).toEqual({ A: 'out-A', B: 'out-B', C: 'out-C' });
    // D appears once in the call list, not twice (no duplicate scheduling)
    expect(runner.callOrder.filter((id) => id === 'D')).toHaveLength(1);
  });

  it('asymmetric fan-in S→A→Aprime→C, S→B→C — C waits for BOTH', async () => {
    // The canonical fan-in bug: from the start, B is depth 1 and Aprime is depth 2.
    // Old BFS scheduled C in wave 2 alongside Aprime → C ran without nodeOutputs[Aprime].
    // New algorithm: C waits until BOTH B and Aprime complete.
    //
    // The asymmetry used to come from B being a second root. With exactly one start
    // required, S fans out to the two legs of differing depth instead — same shape
    // for the scheduler, one legal entrypoint.
    const runner = makeRunner();
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('S'), trigger('A'), trigger('Aprime'), trigger('B'), trigger('C')],
        [
          edge('e1', 'S', 'A'),
          edge('e2', 'A', 'Aprime'),
          edge('e3', 'Aprime', 'C'),
          edge('e4', 'S', 'B'),
          edge('e5', 'B', 'C'),
        ],
      ),
      runner.port,
      events.port,
    );

    expect(runner.callOrder.at(-1)).toBe('C');
    // Both Aprime AND B must precede C in the call order
    const indexC = runner.callOrder.indexOf('C');
    const indexAprime = runner.callOrder.indexOf('Aprime');
    const indexB = runner.callOrder.indexOf('B');
    expect(indexAprime).toBeLessThan(indexC);
    expect(indexB).toBeLessThan(indexC);
    // C sees both upstreams in nodeOutputs
    expect(runner.contexts.C).toEqual({ S: 'out-S', A: 'out-A', Aprime: 'out-Aprime', B: 'out-B' });
  });

  it('decision routing — node reachable only via pruned branch is skipped and reported', async () => {
    // D is a decision picking branch X. C is reachable only via Y → must be skipped.
    const runner = makeRunner({
      D: { output: { matchedBranch: 'X' }, nextPort: 'X' },
    });
    const events = makeEvents();

    await runGraph(
      makeInput([start('D'), trigger('B'), trigger('C')], [edge('e1', 'D', 'B', 'X'), edge('e2', 'D', 'C', 'Y')]),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['D', 'B']);
    // C never ran, but the run says so out loud rather than leaving it indistinguishable
    // from a node still pending. D ran and chose another handle → branch_not_taken.
    expect(events.events.some((event) => event.type === 'node_started' && event.nodeId === 'C')).toBe(false);
    expect(skipsFrom(events.events)).toEqual([{ nodeId: 'C', reason: 'branch_not_taken' }]);
    // Graph still completes successfully
    expect(events.statuses.at(-1)?.status).toBe('completed');
  });

  it('node_skipped lands after the wave that pruned it and before the next wave starts', async () => {
    // Ordering is the contract a log panel renders against: the skip must read as a
    // consequence of D's completion, not arrive interleaved with B's execution.
    const runner = makeRunner({ D: { output: 'd', nextPort: 'X' } });
    const events = makeEvents();

    await runGraph(
      makeInput([start('D'), trigger('B'), trigger('C')], [edge('e1', 'D', 'B', 'X'), edge('e2', 'D', 'C', 'Y')]),
      runner.port,
      events.port,
    );

    expect(events.events.map((event) => `${event.type}:${event.nodeId ?? '-'}`)).toEqual([
      'execution_started:-',
      'node_started:D',
      'node_completed:D',
      'node_skipped:C',
      'node_started:B',
      'node_completed:B',
      'execution_completed:-',
    ]);
  });

  it('decision-pruned fan-in — join executes with only the live predecessor', async () => {
    // D picks X → B runs, C is skipped. E joins B and C — should run with only B's output.
    const runner = makeRunner({
      D: { output: 'd', nextPort: 'X' },
    });
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('D'), trigger('B'), trigger('C'), trigger('E')],
        [edge('e1', 'D', 'B', 'X'), edge('e2', 'D', 'C', 'Y'), edge('e3', 'B', 'E'), edge('e4', 'C', 'E')],
      ),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['D', 'B', 'E']);
    expect(runner.contexts.E).toEqual({ D: 'd', B: 'out-B' });
  });

  it('skip propagates transitively — pruned branch with downstream chain stays dormant', async () => {
    // D picks X. C and C' are both reachable only via Y. Both must be skipped, even
    // though C' has incoming edge from C (its predecessor is also in the dead branch).
    const runner = makeRunner({
      D: { output: 'd', nextPort: 'X' },
    });
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('D'), trigger('B'), trigger('C'), trigger('Cprime'), trigger('E')],
        [
          edge('e1', 'D', 'B', 'X'),
          edge('e2', 'D', 'C', 'Y'),
          edge('e3', 'C', 'Cprime'),
          edge('e4', 'B', 'E'),
          edge('e5', 'Cprime', 'E'),
        ],
      ),
      runner.port,
      events.port,
    );

    // Only D, B, and E execute
    expect(runner.callOrder.sort()).toEqual(['B', 'D', 'E']);
    expect(runner.contexts.E).toEqual({ D: 'd', B: 'out-B' });
    // C is the head of the dead branch (D ran, chose X); Cprime is deeper inside it.
    expect(skipsFrom(events.events)).toEqual([
      { nodeId: 'C', reason: 'branch_not_taken' },
      { nodeId: 'Cprime', reason: 'upstream_skipped' },
    ]);
  });

  it("skip reason ignores the order a join's predecessors resolve in", async () => {
    // J joins two dead edges of different kinds: C→J (C was itself skipped) resolves
    // first, then B→J (B ran and routed to K instead). One live-but-pruned incoming
    // edge is enough, so J reports branch_not_taken regardless of which edge lands
    // last — a "whichever predecessor resolved last wins" rule would call it
    // upstream_skipped here.
    const runner = makeRunner({ D: { output: 'd', nextPort: 'X' }, B: { output: 'b', nextPort: 'P' } });
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('D'), trigger('B'), trigger('C'), trigger('J'), trigger('K')],
        [
          edge('e1', 'D', 'B', 'X'),
          edge('e2', 'D', 'C', 'Y'),
          edge('e3', 'C', 'J'),
          edge('e4', 'B', 'J', 'Q'),
          edge('e5', 'B', 'K', 'P'),
        ],
      ),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['D', 'B', 'K']);
    expect(skipsFrom(events.events)).toEqual([
      { nodeId: 'C', reason: 'branch_not_taken' },
      { nodeId: 'J', reason: 'branch_not_taken' },
    ]);
  });

  it('failure short-circuits the graph — emits execution_failed and stops', async () => {
    const runner = makeRunner({
      B: { throws: 'boom' },
    });
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput([start('A'), trigger('B'), trigger('C')], [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')]),
      runner.port,
      events.port,
    );

    // A runs, B fails, C never starts
    expect(runner.callOrder).toEqual(['A', 'B']);
    const failedEvent = events.events.find((event) => event.type === 'execution_failed');
    expect(failedEvent).toBeDefined();
    expect(events.statuses.at(-1)).toEqual({ status: 'failed', errorMessage: 'boom' });
    expect(outcome).toEqual({ status: 'failed', error: { message: 'boom' } });
  });

  it('a graph rejected by the start-node rule fails the run before any node executes', async () => {
    // The rule itself — missing start, duplicate starts, an edge back into the start,
    // orphans — is covered in resolve-start-node.test.ts. What matters here is the
    // wiring: a rejected graph fails the execution, reports the reason, and runs
    // nothing. Orphan is the motivating shape: its only edge was deleted, so inferring
    // roots from in-degree would run it in wave 1 with no upstream output and still
    // feed its result downstream.
    const runner = makeRunner();
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput([start('T'), trigger('A'), trigger('Orphan')], [edge('e1', 'T', 'A')]),
      runner.port,
      events.port,
    );

    const message = 'Workflow has orphaned nodes (no incoming edge and not a start node): Orphan';
    expect(outcome).toEqual({ status: 'failed', error: { message } });
    expect(runner.callOrder).toEqual([]);
    expect(events.events.map((event) => event.type)).toEqual(['execution_started', 'execution_failed']);
    expect(events.statuses.at(-1)).toEqual({ status: 'failed', errorMessage: message });
  });

  it('cycle reachable from an entrypoint fails the workflow with a stalled-node message', async () => {
    // A is an entrypoint; B and C form a cycle (B→C, C→B). Neither's pending
    // counter reaches 0 because they're each other's predecessors, so neither
    // executes. The post-loop stall check catches this and fails the workflow
    // with a message naming the stuck nodes — instead of silently completing
    // with parts of the graph never run.
    const runner = makeRunner();
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput(
        [start('A'), trigger('B'), trigger('C')],
        [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'C', 'B')],
      ),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['A']);
    const failedEvent = events.events.find((event) => event.type === 'execution_failed');
    expect(failedEvent?.payload).toEqual({
      error: { message: expect.stringContaining('Workflow stalled') },
    });
    expect(outcome.status).toBe('failed');
    expect(events.statuses.at(-1)?.status).toBe('failed');
    expect(events.statuses.at(-1)?.errorMessage).toContain('B');
    expect(events.statuses.at(-1)?.errorMessage).toContain('C');
  });

  it('NodeExecutionError thrown by an executor — code propagated into node_failed payload', async () => {
    // Decision executor throws NodeExecutionError with a structured code when
    // no branch matches. The runner's catch must forward that code into the
    // node_failed event's error payload (the existing ExecutionErrorPayload
    // already declares `code?: string` — this test pins down that wiring).
    const runner: ActivityRunnerPort<TestNode> = {
      async executeNode(node) {
        if (node.id === 'D') {
          throw new NodeExecutionError('no_branch_matched', 'Decision node has no matching branch');
        }
        return { output: `out-${node.id}` };
      },
    };
    const events = makeEvents();

    await runGraph(makeInput([start('A'), trigger('D')], [edge('e1', 'A', 'D')]), runner, events.port);

    const nodeFailed = events.events.find((event) => event.type === 'node_failed' && event.nodeId === 'D');
    expect(nodeFailed?.payload).toEqual({
      error: { message: 'Decision node has no matching branch', code: 'no_branch_matched' },
    });

    expect(events.events.some((event) => event.type === 'execution_failed')).toBe(true);
    expect(events.statuses.at(-1)).toEqual({
      status: 'failed',
      errorMessage: 'Decision node has no matching branch',
    });
  });

  it('plain Error thrown by an executor — no code field in node_failed payload', async () => {
    // Counterpart to the previous test: confirms code is *only* emitted when
    // the executor specifically throws NodeExecutionError. Plain Error keeps
    // the current shape — message-only — so existing consumers don't break.
    const runner: ActivityRunnerPort<TestNode> = {
      async executeNode(node) {
        if (node.id === 'B') throw new Error('boom');
        return { output: `out-${node.id}` };
      },
    };
    const events = makeEvents();

    await runGraph(makeInput([start('A'), trigger('B')], [edge('e1', 'A', 'B')]), runner, events.port);

    const nodeFailed = events.events.find((event) => event.type === 'node_failed' && event.nodeId === 'B');
    expect(nodeFailed?.payload).toEqual({ error: { message: 'boom' } });
  });

  it('wrapped error (Error.cause chain) — surfaces the root cause, not the wrapper', async () => {
    // Pin: the Temporal adapter (and any other middleware that wraps activity
    // throws) presents the runner with an outer Error whose `.message` is a
    // generic wrapper ("Activity task failed") and the actual reason in
    // `.cause`. Returning the wrapper message hides every real failure
    // ("Malformed template reference: …", LLM rate-limited, DB timeout)
    // behind the same opaque string. The runner must walk the chain.
    const wrapped = new Error('Activity task failed', {
      cause: new Error('Malformed template reference: {{nodes.foo?bar}}'),
    });
    const runner: ActivityRunnerPort<TestNode> = {
      async executeNode(node) {
        if (node.id === 'B') throw wrapped;
        return { output: `out-${node.id}` };
      },
    };
    const events = makeEvents();

    await runGraph(makeInput([start('A'), trigger('B')], [edge('e1', 'A', 'B')]), runner, events.port);

    const nodeFailed = events.events.find((event) => event.type === 'node_failed' && event.nodeId === 'B');
    expect(nodeFailed?.payload).toEqual({
      error: { message: 'Malformed template reference: {{nodes.foo?bar}}' },
    });
    expect(events.statuses.at(-1)?.errorMessage).toBe('Malformed template reference: {{nodes.foo?bar}}');
  });

  it('deeply nested Error.cause chain — walks to the deepest cause', async () => {
    // Two levels of wrapping (e.g. Temporal ActivityFailure → ApplicationFailure
    // → original Error). Walk should not stop at the first hop.
    const inner = new Error('rate limit exceeded');
    const middle = new Error('LLM call failed', { cause: inner });
    const outer = new Error('Activity task failed', { cause: middle });

    const runner: ActivityRunnerPort<TestNode> = {
      async executeNode() {
        throw outer;
      },
    };
    const events = makeEvents();

    await runGraph(makeInput([start('A')], []), runner, events.port);

    const nodeFailed = events.events.find((event) => event.type === 'node_failed');
    expect(nodeFailed?.payload).toEqual({ error: { message: 'rate limit exceeded' } });
  });

  it('cyclic Error.cause chain — terminates instead of hanging', async () => {
    // The chain walker must not trust adapter code to produce acyclic causes.
    // A middleware that re-throws with `cause: originalError` while the
    // original already references the wrapper produces a cycle, and an
    // unbounded `while (current.cause) current = current.cause` would spin
    // forever — fatal inside the Temporal sandbox, where it would also
    // hang every replay. A bounded walk (depth cap) keeps the runner
    // responsive even under buggy adapter wiring.
    const outer = new Error('Activity task failed') as Error & { cause?: unknown };
    const inner = new Error('inner cause') as Error & { cause?: unknown };
    outer.cause = inner;
    inner.cause = outer;

    const runner: ActivityRunnerPort<TestNode> = {
      async executeNode() {
        throw outer;
      },
    };
    const events = makeEvents();

    await runGraph(makeInput([start('A')], []), runner, events.port);

    const nodeFailed = events.events.find((event) => event.type === 'node_failed');
    expect(nodeFailed).toBeDefined();
    // The exact message after a cycle is implementation-defined (whichever
    // node we were on when the cap tripped). What matters: the run terminates
    // and emits `node_failed` with one of the two messages in the cycle.
    const message = (nodeFailed?.payload as { error: { message: string } }).error.message;
    expect(['Activity task failed', 'inner cause']).toContain(message);
  }, 2000);

  it('NodeExecutionError code survives wrapping in a generic Error', async () => {
    // If the original throw was a structured NodeExecutionError but a wrapper
    // re-throws as plain Error with `cause`, the code should still surface so
    // downstream consumers can branch on it.
    const original = new NodeExecutionError('rate_limited', 'slow down, partner');
    const wrapped = new Error('Activity task failed', { cause: original });

    const runner: ActivityRunnerPort<TestNode> = {
      async executeNode() {
        throw wrapped;
      },
    };
    const events = makeEvents();

    await runGraph(makeInput([start('A')], []), runner, events.port);

    const nodeFailed = events.events.find((event) => event.type === 'node_failed');
    expect(nodeFailed?.payload).toEqual({
      error: { message: 'slow down, partner', code: 'rate_limited' },
    });
  });
});

// `runGraph` is re-exported from `./workflow`, which is the sandbox-safe entry
// imported by Temporal workflow code. Anything non-deterministic inside the
// runner — `new Date()`, `Math.random()`, console writes routed through
// `createConsoleLogger` — poisons history replay. These pins guard the
// decision to keep the runner observability-free except for `EventEmitterPort`.
describe('runGraph — replay safety (sandbox-safe)', () => {
  let consoleSpies: Record<'debug' | 'info' | 'warn' | 'error', ReturnType<typeof vi.spyOn>>;

  beforeEach(() => {
    consoleSpies = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function expectNoConsoleWrites(): void {
    expect(consoleSpies.debug).not.toHaveBeenCalled();
    expect(consoleSpies.info).not.toHaveBeenCalled();
    expect(consoleSpies.warn).not.toHaveBeenCalled();
    expect(consoleSpies.error).not.toHaveBeenCalled();
  }

  it('exposes exactly 3 parameters — re-adding `logger?` would silently break replay', () => {
    // Type-level pin: `Parameters<typeof runGraph>` must stay length 3. An
    // optional 4th param (`logger?: LoggerPort`) would still be length 3 at
    // runtime because optionals don't bump `Function.prototype.length`, but
    // `expectTypeOf` catches the tuple shape at compile time.
    expectTypeOf<Parameters<typeof runGraph>['length']>().toEqualTypeOf<3>();
  });

  it('a successful multi-node run writes nothing to console', async () => {
    const runner = makeRunner();
    const events = makeEvents();

    await runGraph(
      makeInput([start('A'), trigger('B'), trigger('C')], [edge('e1', 'A', 'B'), edge('e2', 'A', 'C')]),
      runner.port,
      events.port,
    );

    expect(events.statuses.at(-1)?.status).toBe('completed');
    expectNoConsoleWrites();
  });

  it('a node failure writes nothing to console — failure flows only through events', async () => {
    const runner = makeRunner({ B: { throws: 'boom' } });
    const events = makeEvents();

    await runGraph(makeInput([start('A'), trigger('B')], [edge('e1', 'A', 'B')]), runner.port, events.port);

    expect(events.statuses.at(-1)?.status).toBe('failed');
    expect(events.events.some((event) => event.type === 'node_failed' && event.nodeId === 'B')).toBe(true);
    expectNoConsoleWrites();
  });

  it('a swallowed node_skipped emit failure writes nothing to console', async () => {
    // The catch around the skip emit is the one place tempted into a console.warn.
    // Inside the sandbox that would poison replay, so the failure stays silent.
    const runner = makeRunner({ D: { output: 'd', nextPort: 'X' } });
    const events = makeEvents({ type: 'node_skipped', nodeId: 'C', message: 'events table unreachable' });

    await runGraph(
      makeInput([start('D'), trigger('B'), trigger('C')], [edge('e1', 'D', 'B', 'X'), edge('e2', 'D', 'C', 'Y')]),
      runner.port,
      events.port,
    );

    expect(events.statuses.at(-1)?.status).toBe('completed');
    expectNoConsoleWrites();
  });

  it('a stalled run (cycle) writes nothing to console — stall surfaces via execution_failed event', async () => {
    // B↔C cycle reachable from A. Runner can't drain it; the post-loop stall
    // check fires and emits execution_failed via EventEmitterPort — no console.
    const runner = makeRunner();
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('A'), trigger('B'), trigger('C')],
        [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'C', 'B')],
      ),
      runner.port,
      events.port,
    );

    const failedEvent = events.events.find((event) => event.type === 'execution_failed');
    expect(failedEvent?.payload).toEqual({
      error: { message: expect.stringContaining('Workflow stalled') },
    });
    expectNoConsoleWrites();
  });

  it('a missing start node writes nothing to console — surfaces via execution_failed event', async () => {
    const runner = makeRunner();
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput([trigger('A'), trigger('B')], [edge('e1', 'A', 'B')]),
      runner.port,
      events.port,
    );

    expect(outcome.status).toBe('failed');
    const failedEvent = events.events.find((event) => event.type === 'execution_failed');
    expect(failedEvent?.payload).toEqual({
      error: { message: 'Workflow has no start node: exactly one node must be marked as the start node' },
    });
    expectNoConsoleWrites();
  });
});

describe('runGraph — errorPolicy', () => {
  it('a failing node_started is a step failure — node_failed is emitted and the node never runs', async () => {
    const runner = makeRunner();
    const events = makeEvents({ type: 'node_started', nodeId: 'B', message: 'events table unreachable' });

    const outcome = await runGraph(
      makeInput([start('A'), trigger('B'), trigger('C')], [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')]),
      runner.port,
      events.port,
    );

    // B's executor is never reached, but the failure is reported as B's.
    expect(runner.callOrder).toEqual(['A']);
    expect(events.events.some((event) => event.type === 'node_failed' && event.nodeId === 'B')).toBe(true);
    expect(outcome).toEqual({ status: 'failed', error: { message: 'events table unreachable' } });
    expect(events.statuses.at(-1)).toEqual({ status: 'failed', errorMessage: 'events table unreachable' });
  });

  it("a failing node_started honors 'continue' — downstream still runs", async () => {
    const runner = makeRunner();
    const events = makeEvents({ type: 'node_started', nodeId: 'B', message: 'events table unreachable' });

    const outcome = await runGraph(
      makeInput([start('A'), trigger('B', 'continue'), trigger('C')], [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')]),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['A', 'C']);
    expect(runner.contexts.C).toEqual({ A: 'out-A', B: { error: { message: 'events table unreachable' } } });
    expect(outcome).toEqual({ status: 'completed' });
  });

  it("a failing node_started honors 'errorRoute' — the error branch fires", async () => {
    const runner = makeRunner();
    const events = makeEvents({ type: 'node_started', nodeId: 'B', message: 'events table unreachable' });

    const outcome = await runGraph(
      makeInput(
        [start('A'), trigger('B', 'errorRoute'), trigger('Recover'), trigger('Success')],
        [edge('e1', 'A', 'B'), edge('e2', 'B', 'Recover', 'errorRoute'), edge('e3', 'B', 'Success')],
      ),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['A', 'Recover']);
    expect(outcome).toEqual({ status: 'completed' });
  });

  it("'fail' set explicitly behaves like the default — aborts the workflow", async () => {
    // Regression pin: making the policy explicit must not change behavior.
    const runner = makeRunner({ B: { throws: 'boom' } });
    const events = makeEvents();

    await runGraph(
      makeInput([start('A'), trigger('B', 'fail'), trigger('C')], [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')]),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['A', 'B']);
    expect(events.statuses.at(-1)).toEqual({ status: 'failed', errorMessage: 'boom' });
  });

  it("'continue' absorbs the error — downstream runs and sees { error } in nodeOutputs", async () => {
    const runner = makeRunner({ B: { throws: 'boom' } });
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput([start('A'), trigger('B', 'continue'), trigger('C')], [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')]),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['A', 'B', 'C']);
    expect(runner.contexts.C).toEqual({ A: 'out-A', B: { error: { message: 'boom' } } });
    // node_failed for B was emitted, execution itself completed.
    expect(events.events.some((event) => event.type === 'node_failed' && event.nodeId === 'B')).toBe(true);
    expect(events.statuses.at(-1)?.status).toBe('completed');
    expect(outcome).toEqual({ status: 'completed' });
  });

  it("'continue' preserves NodeExecutionError code in the absorbed output", async () => {
    const contexts: Record<string, Record<string, unknown>> = {};
    const runner: ActivityRunnerPort<TestNode> = {
      async executeNode(node, context) {
        contexts[node.id] = { ...context.nodeOutputs };
        if (node.id === 'B') throw new NodeExecutionError('rate_limited', 'slow down');
        return { output: `out-${node.id}` };
      },
    };
    const events = makeEvents();

    await runGraph(
      makeInput([start('A'), trigger('B', 'continue'), trigger('C')], [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')]),
      runner,
      events.port,
    );

    // The downstream node sees the structured code, not just the message.
    expect(contexts.C).toEqual({ A: 'out-A', B: { error: { message: 'slow down', code: 'rate_limited' } } });
    expect(events.statuses.at(-1)?.status).toBe('completed');
  });

  it("'errorRoute' follows only the 'errorRoute' source handle — success branch is skipped", async () => {
    // B fails with errorRoute: edges with sourceHandle === 'errorRoute' are alive,
    // every other handle is pruned via the standard skip-propagation path.
    const runner = makeRunner({ B: { throws: 'boom' } });
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput(
        [start('A'), trigger('B', 'errorRoute'), trigger('Success'), trigger('Recovery')],
        [edge('e1', 'A', 'B'), edge('e2', 'B', 'Success', 'success'), edge('e3', 'B', 'Recovery', 'errorRoute')],
      ),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['A', 'B', 'Recovery']);
    expect(events.events.some((event) => event.type === 'node_started' && event.nodeId === 'Success')).toBe(false);
    // B ran (and failed) before routing to the error handle, so the pruned success
    // branch is a branch not taken — not an upstream skip.
    expect(skipsFrom(events.events)).toEqual([{ nodeId: 'Success', reason: 'branch_not_taken' }]);
    expect(runner.contexts.Recovery).toEqual({ A: 'out-A', B: { error: { message: 'boom' } } });
    expect(events.statuses.at(-1)?.status).toBe('completed');
    expect(outcome).toEqual({ status: 'completed' });
  });

  it("'errorRoute' — skip propagates transitively through the dead success branch", async () => {
    // B fails with errorRoute; only Recovery (via 'errorRoute') runs. Success and its
    // downstream Success' are both skipped. Recovery's downstream still runs.
    const runner = makeRunner({ B: { throws: 'boom' } });
    const events = makeEvents();

    await runGraph(
      makeInput(
        [
          start('A'),
          trigger('B', 'errorRoute'),
          trigger('Success'),
          trigger('SuccessPrime'),
          trigger('Recovery'),
          trigger('Done'),
        ],
        [
          edge('e1', 'A', 'B'),
          edge('e2', 'B', 'Success', 'success'),
          edge('e3', 'Success', 'SuccessPrime'),
          edge('e4', 'B', 'Recovery', 'errorRoute'),
          edge('e5', 'Recovery', 'Done'),
        ],
      ),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['A', 'B', 'Recovery', 'Done']);
    expect(skipsFrom(events.events)).toEqual([
      { nodeId: 'Success', reason: 'branch_not_taken' },
      { nodeId: 'SuccessPrime', reason: 'upstream_skipped' },
    ]);
    expect(events.statuses.at(-1)?.status).toBe('completed');
  });

  it("'continue' in a diamond — join sees the failed branch's error alongside the live one", async () => {
    const runner = makeRunner({ B: { throws: 'boom' } });
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('A'), trigger('B', 'continue'), trigger('C'), trigger('D')],
        [edge('e1', 'A', 'B'), edge('e2', 'A', 'C'), edge('e3', 'B', 'D'), edge('e4', 'C', 'D')],
      ),
      runner.port,
      events.port,
    );

    expect(runner.callOrder.at(-1)).toBe('D');
    expect(runner.contexts.D).toEqual({
      A: 'out-A',
      B: { error: { message: 'boom' } },
      C: 'out-C',
    });
    expect(events.statuses.at(-1)?.status).toBe('completed');
  });

  it('mixed policies in one wave — a fatal failure still aborts even alongside continue', async () => {
    // A fans out to B (continue, fails) and C (fail, fails). The fatal failure wins.
    // B still propagates — its absorbed error reaches S — but S became ready in the
    // aborted wave, so it never runs and emits nothing.
    const runner = makeRunner({
      B: { throws: 'soft' },
      C: { throws: 'hard' },
    });
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('A'), trigger('B', 'continue'), trigger('C', 'fail'), trigger('S')],
        [edge('e1', 'A', 'B'), edge('e2', 'A', 'C'), edge('e3', 'B', 'S')],
      ),
      runner.port,
      events.port,
    );

    expect(events.statuses.at(-1)).toEqual({ status: 'failed', errorMessage: 'hard' });
    expect(runner.callOrder).not.toContain('S');
    expect(events.events.some((event) => event.nodeId === 'S')).toBe(false);
  });

  it("fatal wave — a surviving sibling's dead branch is skipped before execution_failed", async () => {
    // A fans out to D (routes to X) and C (fatal). D's pruned Y branch still owes a
    // node_skipped: a failed run is exactly where a post-mortem needs to tell "never
    // taken" from "never reached". execution_failed stays last so the SSE drain, which
    // closes on the terminal event, never truncates the skips.
    const runner = makeRunner({ D: { output: 'd', nextPort: 'X' }, C: { throws: 'hard' } });
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput(
        [start('A'), trigger('D'), trigger('C', 'fail'), trigger('L'), trigger('M')],
        [edge('e1', 'A', 'D'), edge('e2', 'A', 'C'), edge('e3', 'D', 'L', 'X'), edge('e4', 'D', 'M', 'Y')],
      ),
      runner.port,
      events.port,
    );

    expect(skipsFrom(events.events)).toEqual([{ nodeId: 'M', reason: 'branch_not_taken' }]);
    expect(events.events.at(-1)?.type).toBe('execution_failed');
    expect(events.events.at(-2)).toMatchObject({ type: 'node_skipped', nodeId: 'M' });
    expect(outcome).toEqual({ status: 'failed', error: { message: 'hard' } });
    // L became ready in the aborted wave — never reached, so no event of its own.
    expect(events.events.some((event) => event.nodeId === 'L')).toBe(false);
  });

  it('fatal wave — nodes downstream of the fatal node get no event at all', async () => {
    // N sits behind the fatal C. It is not skipped (nothing routed away from it),
    // it is simply never resolved — the distinction the sibling execution_incomplete
    // work owns. Emitting node_skipped here would claim a decision that never happened.
    const runner = makeRunner({ D: { output: 'd', nextPort: 'X' }, C: { throws: 'hard' } });
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('A'), trigger('D'), trigger('C', 'fail'), trigger('L'), trigger('M'), trigger('N')],
        [
          edge('e1', 'A', 'D'),
          edge('e2', 'A', 'C'),
          edge('e3', 'D', 'L', 'X'),
          edge('e4', 'D', 'M', 'Y'),
          edge('e5', 'C', 'N'),
        ],
      ),
      runner.port,
      events.port,
    );

    expect(events.events.some((event) => event.nodeId === 'N')).toBe(false);
    expect(skipsFrom(events.events)).toEqual([{ nodeId: 'M', reason: 'branch_not_taken' }]);
  });

  it('two fatal failures in one wave — the first in node order names the failure, neither propagates', async () => {
    const runner = makeRunner({ C1: { throws: 'first' }, C2: { throws: 'second' } });
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput(
        [start('A'), trigger('C1', 'fail'), trigger('C2', 'fail'), trigger('X1'), trigger('X2')],
        [edge('e1', 'A', 'C1'), edge('e2', 'A', 'C2'), edge('e3', 'C1', 'X1'), edge('e4', 'C2', 'X2')],
      ),
      runner.port,
      events.port,
    );

    expect(outcome).toEqual({ status: 'failed', error: { message: 'first' } });
    expect(events.events.some((event) => event.nodeId === 'X1' || event.nodeId === 'X2')).toBe(false);
    expect(events.events.at(-1)?.type).toBe('execution_failed');
  });

  it("fatal wave — an 'errorRoute' sibling still routes, and its pruned branch is skipped", async () => {
    // R fails with errorRoute in the same wave as the fatal C. R's error routing still
    // happens (S is pruned and reported), but Recover became ready in the aborted wave,
    // so it never runs.
    const runner = makeRunner({ R: { throws: 'soft' }, C: { throws: 'hard' } });
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('A'), trigger('R', 'errorRoute'), trigger('C', 'fail'), trigger('Recover'), trigger('S')],
        [edge('e1', 'A', 'R'), edge('e2', 'A', 'C'), edge('e3', 'R', 'Recover', 'errorRoute'), edge('e4', 'R', 'S')],
      ),
      runner.port,
      events.port,
    );

    expect(skipsFrom(events.events)).toEqual([{ nodeId: 'S', reason: 'branch_not_taken' }]);
    expect(events.events.some((event) => event.nodeId === 'Recover')).toBe(false);
    expect(events.events.at(-1)?.type).toBe('execution_failed');
    expect(events.statuses.at(-1)).toEqual({ status: 'failed', errorMessage: 'hard' });
  });

  it("'errorRoute' with no 'errorRoute' edge — run ends incomplete, not as a silent DLQ", async () => {
    // Behaviour reversal: this used to end the run cleanly, documented as a silent DLQ.
    // The policy names a port, so 'errorRoute' with nothing wired to it is the same
    // broken promise as a decision routing to a handle nobody connected. Deliberate
    // absorption is what 'continue' is for.
    const runner = makeRunner({ A: { throws: 'boom' } });
    const events = makeEvents();

    const outcome = await runGraph(makeInput([start('A', 'errorRoute')], []), runner.port, events.port);

    expect(events.events.some((event) => event.type === 'node_failed' && event.nodeId === 'A')).toBe(true);
    expect(outcome).toEqual({ status: 'incomplete', deadEnds: [{ nodeId: 'A', port: 'errorRoute' }] });
    expect(events.statuses.at(-1)?.status).toBe('incomplete');
  });

  it("'continue' does not fire edges tagged with the reserved 'errorRoute' source handle", async () => {
    // Regression pin: the error branch is reserved for 'errorRoute'. With
    // 'continue', the failed node's downstream still runs, but the
    // dedicated error edge stays dormant.
    const runner = makeRunner({ B: { throws: 'boom' } });
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('A'), trigger('B', 'continue'), trigger('Success'), trigger('ErrorBranch')],
        [edge('e1', 'A', 'B'), edge('e2', 'B', 'Success'), edge('e3', 'B', 'ErrorBranch', 'errorRoute')],
      ),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['A', 'B', 'Success']);
    expect(events.events.some((event) => event.type === 'node_started' && event.nodeId === 'ErrorBranch')).toBe(false);
    // B failed, but its dedicated error edge is dormant rather than routed away from —
    // reporting 'branch_not_taken' here would read as a contradiction next to node_failed.
    expect(skipsFrom(events.events)).toEqual([{ nodeId: 'ErrorBranch', reason: 'error_route_not_taken' }]);
    expect(events.statuses.at(-1)?.status).toBe('completed');
  });

  it("success path prunes edges tagged with the reserved 'errorRoute' source handle", async () => {
    // Reservation applies even when nothing throws: a happy-path node
    // never fires its 'errorRoute' branch.
    const runner = makeRunner({});
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('A'), trigger('Success'), trigger('ErrorBranch')],
        [edge('e1', 'A', 'Success'), edge('e2', 'A', 'ErrorBranch', 'errorRoute')],
      ),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['A', 'Success']);
    expect(events.events.some((event) => event.type === 'node_started' && event.nodeId === 'ErrorBranch')).toBe(false);
    // Every healthy run of a graph with error handling wired up lands here, so the
    // reason has to say "nothing failed" rather than "a branch was not taken".
    expect(skipsFrom(events.events)).toEqual([{ nodeId: 'ErrorBranch', reason: 'error_route_not_taken' }]);
    expect(events.statuses.at(-1)?.status).toBe('completed');
  });

  it('dormant error branch — the subtree below it is still upstream_skipped', async () => {
    // Only the head of the dormant branch gets the error-specific reason; nodes deeper
    // in it were skipped because their predecessor was, same as any other dead branch.
    const runner = makeRunner({});
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('A'), trigger('Success'), trigger('ErrorBranch'), trigger('Cleanup')],
        [
          edge('e1', 'A', 'Success'),
          edge('e2', 'A', 'ErrorBranch', 'errorRoute'),
          edge('e3', 'ErrorBranch', 'Cleanup'),
        ],
      ),
      runner.port,
      events.port,
    );

    expect(skipsFrom(events.events)).toEqual([
      { nodeId: 'ErrorBranch', reason: 'error_route_not_taken' },
      { nodeId: 'Cleanup', reason: 'upstream_skipped' },
    ]);
  });

  it('mixed incoming pruning — a routed-away branch outranks a dormant error edge', async () => {
    // J hangs off both S1's dormant error edge and S2's branch that routed to K.
    // Something actively routed away from J, so that is the reason worth reporting;
    // calling it a dormant error branch would hide a real routing decision.
    const runner = makeRunner({ S2: { output: 's2', nextPort: 'P' } });
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('A'), trigger('S1'), trigger('S2'), trigger('J'), trigger('K')],
        [
          edge('e1', 'A', 'S1'),
          edge('e2', 'A', 'S2'),
          edge('e3', 'S1', 'J', 'errorRoute'),
          edge('e4', 'S2', 'J', 'Q'),
          edge('e5', 'S2', 'K', 'P'),
        ],
      ),
      runner.port,
      events.port,
    );

    expect(runner.callOrder.sort()).toEqual(['A', 'K', 'S1', 'S2']);
    expect(skipsFrom(events.events)).toEqual([{ nodeId: 'J', reason: 'branch_not_taken' }]);
  });

  it('mixed incoming pruning — precedence holds when the error edge resolves last', async () => {
    // Mirror of the previous case with the two sources declared the other way round.
    // A last-edge-wins rule would flip this to error_route_not_taken.
    const runner = makeRunner({ S2: { output: 's2', nextPort: 'P' } });
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('A'), trigger('S2'), trigger('S1'), trigger('J'), trigger('K')],
        [
          edge('e1', 'A', 'S2'),
          edge('e2', 'A', 'S1'),
          edge('e3', 'S2', 'J', 'Q'),
          edge('e4', 'S1', 'J', 'errorRoute'),
          edge('e5', 'S2', 'K', 'P'),
        ],
      ),
      runner.port,
      events.port,
    );

    expect(skipsFrom(events.events)).toEqual([{ nodeId: 'J', reason: 'branch_not_taken' }]);
  });
});

describe('runGraph — node_skipped emit failures', () => {
  // node_skipped is advisory: it reports a node that was never going to execute.
  // An exhausted emit must therefore not take down a run that is otherwise healthy —
  // unlike node_started/node_completed, which describe real work and route through
  // errorPolicy. The lost row leaves a sequence gap the backend drain steps over.
  it('a failing node_skipped emit does not fail the run', async () => {
    const runner = makeRunner({ D: { output: 'd', nextPort: 'X' } });
    const events = makeEvents({ type: 'node_skipped', nodeId: 'C', message: 'events table unreachable' });

    const outcome = await runGraph(
      makeInput([start('D'), trigger('B'), trigger('C')], [edge('e1', 'D', 'B', 'X'), edge('e2', 'D', 'C', 'Y')]),
      runner.port,
      events.port,
    );

    expect(outcome).toEqual({ status: 'completed' });
    expect(events.statuses.at(-1)).toEqual({ status: 'completed', errorMessage: undefined });
    expect(events.events.some((event) => event.type === 'execution_completed')).toBe(true);
    // The run carried on past the failed emit — B still executed.
    expect(runner.callOrder).toEqual(['D', 'B']);
  });

  it('a failing skip emit does not suppress the remaining skips of the wave', async () => {
    // Per-emit try/catch, not one wrapping the loop: C2 is still reported after C1 fails.
    const runner = makeRunner({ D: { output: 'd', nextPort: 'X' } });
    const events = makeEvents({ type: 'node_skipped', nodeId: 'C1', message: 'events table unreachable' });

    const outcome = await runGraph(
      makeInput(
        [start('D'), trigger('B'), trigger('C1'), trigger('C2')],
        [edge('e1', 'D', 'B', 'X'), edge('e2', 'D', 'C1', 'Y'), edge('e3', 'D', 'C2', 'Z')],
      ),
      runner.port,
      events.port,
    );

    expect(skipsFrom(events.events)).toEqual([
      { nodeId: 'C1', reason: 'branch_not_taken' },
      { nodeId: 'C2', reason: 'branch_not_taken' },
    ]);
    expect(outcome).toEqual({ status: 'completed' });
  });

  it('a failing skip emit in a fatal wave still ends with execution_failed last', async () => {
    // The swallowed emit must not disturb the terminal-event contract.
    const runner = makeRunner({ D: { output: 'd', nextPort: 'X' }, C: { throws: 'hard' } });
    const events = makeEvents({ type: 'node_skipped', nodeId: 'M', message: 'events table unreachable' });

    const outcome = await runGraph(
      makeInput(
        [start('A'), trigger('D'), trigger('C', 'fail'), trigger('L'), trigger('M')],
        [edge('e1', 'A', 'D'), edge('e2', 'A', 'C'), edge('e3', 'D', 'L', 'X'), edge('e4', 'D', 'M', 'Y')],
      ),
      runner.port,
      events.port,
    );

    expect(events.events.at(-1)?.type).toBe('execution_failed');
    expect(outcome).toEqual({ status: 'failed', error: { message: 'hard' } });
    expect(events.statuses.at(-1)).toEqual({ status: 'failed', errorMessage: 'hard' });
  });
});

describe('runGraph — incomplete runs (dead ends)', () => {
  it('decision routes to an unwired handle — run ends incomplete and names the node and port', async () => {
    // The motivating case: the edge for branch 'Y' was deleted, but the decision still
    // picks 'Y'. Previously the run closed as completed with a chunk of graph never run.
    const runner = makeRunner({ D: { output: { matchedBranch: 'Y' }, nextPort: 'Y' } });
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput([start('D'), trigger('B')], [edge('e1', 'D', 'B', 'X')]),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['D']);
    expect(outcome).toEqual({ status: 'incomplete', deadEnds: [{ nodeId: 'D', port: 'Y' }] });
    expect(events.events.at(-1)).toEqual({
      type: 'execution_incomplete',
      nodeId: undefined,
      payload: { deadEnds: [{ nodeId: 'D', port: 'Y' }] },
    });
    expect(events.events.some((event) => event.type === 'execution_completed')).toBe(false);
    expect(events.statuses.at(-1)).toEqual({ status: 'incomplete', errorMessage: undefined });
  });

  it('decision with no outgoing edges at all — same rule, no special case', async () => {
    const runner = makeRunner({ D: { output: 'd', nextPort: 'X' } });
    const events = makeEvents();

    const outcome = await runGraph(makeInput([start('D')], []), runner.port, events.port);

    expect(outcome).toEqual({ status: 'incomplete', deadEnds: [{ nodeId: 'D', port: 'X' }] });
  });

  it('plain leaf returns no port — still a completed run', async () => {
    // The negative case the rule hinges on: a branch that simply ends is not a dead end.
    const runner = makeRunner();
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput([start('A'), trigger('B')], [edge('e1', 'A', 'B')]),
      runner.port,
      events.port,
    );

    expect(outcome).toEqual({ status: 'completed' });
    expect(events.events.some((event) => event.type === 'execution_incomplete')).toBe(false);
  });

  it('successful node whose only outgoing edges are error edges — still completed', async () => {
    // A success with an unconnected error branch is a leaf as far as the success path is
    // concerned: `nextPort` is undefined, so the rule must not fire. The case most likely
    // to break under a careless refactor of the dead-end check.
    const runner = makeRunner();
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput([start('A'), trigger('Recovery')], [edge('e1', 'A', 'Recovery', 'errorRoute')]),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['A']);
    expect(outcome).toEqual({ status: 'completed' });
  });

  it('a dead end does not stop the rest of the graph', async () => {
    // Two legs off the start. Leg 1 dead-ends at D; leg 2 must still run to completion,
    // and the run reports incomplete only at the end.
    const runner = makeRunner({ D: { output: 'd', nextPort: 'gone' } });
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput(
        [start('S'), trigger('D'), trigger('Leg2'), trigger('Leg2Prime')],
        [edge('e1', 'S', 'D'), edge('e2', 'S', 'Leg2'), edge('e3', 'Leg2', 'Leg2Prime')],
      ),
      runner.port,
      events.port,
    );

    expect(runner.callOrder).toEqual(['S', 'D', 'Leg2', 'Leg2Prime']);
    expect(outcome).toEqual({ status: 'incomplete', deadEnds: [{ nodeId: 'D', port: 'gone' }] });
  });

  it('several dead ends in one run are all collected', async () => {
    // Both decisions DO have an outgoing edge — just on a handle neither of them picked,
    // so X is pruned and skipped while both routes are recorded as dead ends.
    const runner = makeRunner({
      D1: { output: 'd1', nextPort: 'gone-1' },
      D2: { output: 'd2', nextPort: 'gone-2' },
    });
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput(
        [start('S'), trigger('D1'), trigger('D2'), trigger('X')],
        [edge('e1', 'S', 'D1'), edge('e2', 'S', 'D2'), edge('e3', 'D1', 'X', 'other'), edge('e4', 'D2', 'X', 'other')],
      ),
      runner.port,
      events.port,
    );

    expect(outcome).toEqual({
      status: 'incomplete',
      deadEnds: [
        { nodeId: 'D1', port: 'gone-1' },
        { nodeId: 'D2', port: 'gone-2' },
      ],
    });
  });

  it('a fatal node failure takes precedence over a dead end', async () => {
    // Both happen in the same wave. Failure returns early, so the run never reaches the
    // terminal incomplete check and no execution_incomplete is emitted.
    const runner = makeRunner({
      D: { output: 'd', nextPort: 'gone' },
      Boom: { throws: 'boom' },
    });
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput([start('S'), trigger('D'), trigger('Boom')], [edge('e1', 'S', 'D'), edge('e2', 'S', 'Boom')]),
      runner.port,
      events.port,
    );

    expect(outcome).toEqual({ status: 'failed', error: { message: 'boom' } });
    expect(events.events.some((event) => event.type === 'execution_incomplete')).toBe(false);
    expect(events.statuses.at(-1)?.status).toBe('failed');
  });

  it('a cycle still fails rather than reporting incomplete', async () => {
    // 'stalled' keeps meaning exactly one thing: nodes that never became ready. That is a
    // genuine stall and stays a failure, deliberately not folded into 'incomplete'.
    const runner = makeRunner({ D: { output: 'd', nextPort: 'gone' } });
    const events = makeEvents();

    const outcome = await runGraph(
      makeInput(
        [start('S'), trigger('D'), trigger('B'), trigger('C')],
        [edge('e1', 'S', 'D'), edge('e2', 'S', 'B'), edge('e3', 'B', 'C'), edge('e4', 'C', 'B')],
      ),
      runner.port,
      events.port,
    );

    expect(outcome.status).toBe('failed');
    expect(events.events.some((event) => event.type === 'execution_incomplete')).toBe(false);
  });
});

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

  it('decision routing — node reachable only via pruned branch is skipped silently', async () => {
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
    // No node_started for C
    expect(events.events.some((event) => event.type === 'node_started' && event.nodeId === 'C')).toBe(false);
    // Graph still completes successfully
    expect(events.statuses.at(-1)?.status).toBe('completed');
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
    // A fans out to B (continue, fails) and C (fail, fails). The fatal failure
    // wins; B's absorbed error never gets propagated because the run aborts.
    const runner = makeRunner({
      B: { throws: 'soft' },
      C: { throws: 'hard' },
    });
    const events = makeEvents();

    await runGraph(
      makeInput(
        [start('A'), trigger('B', 'continue'), trigger('C', 'fail')],
        [edge('e1', 'A', 'B'), edge('e2', 'A', 'C')],
      ),
      runner.port,
      events.port,
    );

    expect(events.statuses.at(-1)).toEqual({ status: 'failed', errorMessage: 'hard' });
  });

  it("'errorRoute' with no 'errorRoute' edge — workflow completes as a silent DLQ", async () => {
    // No outgoing edge with sourceHandle 'errorRoute' means routing has nowhere to
    // go. The runner emits node_failed and ends the run cleanly — useful when
    // the caller just wants the failure recorded.
    const runner = makeRunner({ A: { throws: 'boom' } });
    const events = makeEvents();

    await runGraph(makeInput([start('A', 'errorRoute')], []), runner.port, events.port);

    expect(events.events.some((event) => event.type === 'node_failed' && event.nodeId === 'A')).toBe(true);
    expect(events.statuses.at(-1)?.status).toBe('completed');
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
    expect(events.statuses.at(-1)?.status).toBe('completed');
  });
});

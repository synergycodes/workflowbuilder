import { describe, expect, it } from 'vitest';

import type {
  BaseNode,
  WorkflowDefinition,
  WorkflowEdgeDefinition,
} from '@workflow-builder/types/workflow-execution/execution-model';

import { NodeExecutionError } from './errors';
import { runGraph } from './graph-runner';
import type { ActivityRunnerPort } from './ports/activity-runner.port';
import type { EventEmitterPort } from './ports/event-emitter.port';
import type { WorkflowExecutionInput } from './ports/workflow-engine.port';

// Replay determinism is verified by running the same graph N times against
// identical deterministic mocks and asserting that every observable call to
// the runner's ports comes out byte-equivalent across runs.
//
// What this catches: any non-determinism the runner introduces itself —
// Date.now(), Math.random(), Promise.race ordering, accidental Set traversal,
// re-ordered Map iteration. Each of those would diverge between runs even
// without Temporal in the loop.
//
// What this does NOT catch: replay against a stored Temporal history with a
// different worker version. That is a separate (heavier) test path; see
// `replay-audit.md` for the rationale on why we chose this lighter form.

type TestNode = BaseNode & { type: 'test/node' };

type Behavior = {
  output?: unknown;
  nextPort?: string;
  throws?: { message: string; code?: string };
};

type EventCall = { type: string; nodeId?: string; payload?: unknown };
type StatusCall = { status: string; errorMessage?: string };

type RunRecord = {
  activityCallOrder: string[];
  events: EventCall[];
  statuses: StatusCall[];
};

// Build a fresh pair of ports for each run. The behaviors map is the same
// across runs so the activity outputs are byte-equivalent — any divergence
// in the recorded sequence below points squarely at the runner.
function makePorts(behaviors: Record<string, Behavior>): {
  runner: ActivityRunnerPort<TestNode>;
  events: EventEmitterPort;
  record: RunRecord;
} {
  const record: RunRecord = { activityCallOrder: [], events: [], statuses: [] };

  const runner: ActivityRunnerPort<TestNode> = {
    async executeNode(node) {
      record.activityCallOrder.push(node.id);
      const b = behaviors[node.id];
      if (b?.throws) {
        if (b.throws.code !== undefined) throw new NodeExecutionError(b.throws.code, b.throws.message);
        throw new Error(b.throws.message);
      }
      return { output: b?.output ?? `out-${node.id}`, nextPort: b?.nextPort };
    },
  };

  const events: EventEmitterPort = {
    async emitEvent(_executionId, type, payload, nodeId) {
      record.events.push({ type, nodeId, payload });
    },
    async updateStatus(_executionId, status, errorMessage) {
      record.statuses.push({ status, errorMessage });
    },
  };

  return { runner, events, record };
}

function trigger(id: string): TestNode {
  return { id, type: 'test/node', config: {} };
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

// Repeat the run N times. Returns N records to compare for equivalence.
async function runNTimes(
  input: WorkflowExecutionInput<TestNode>,
  behaviors: Record<string, Behavior>,
  n: number,
): Promise<RunRecord[]> {
  const records: RunRecord[] = [];
  for (let index = 0; index < n; index++) {
    const { runner, events, record } = makePorts(behaviors);
    await runGraph(input, runner, events);
    records.push(record);
  }
  return records;
}

// JSON-stringify gives us byte-equivalence over the recorded shape — easier
// to surface in a failed assertion than a deep-equal that hides which key
// drifted across runs.
function fingerprint(record: RunRecord): string {
  return JSON.stringify(record);
}

function expectAllRunsIdentical(records: RunRecord[]): void {
  const first = fingerprint(records[0]!);
  for (let index = 1; index < records.length; index++) {
    expect(fingerprint(records[index]!), `run ${index} diverged from run 0`).toBe(first);
  }
}

const RUNS = 10;

describe('runGraph — replay determinism (re-execution equivalence)', () => {
  it('linear A→B→C — every run produces the same activity order, events, statuses', async () => {
    const input = makeInput([trigger('A'), trigger('B'), trigger('C')], [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')]);

    const records = await runNTimes(input, {}, RUNS);
    expectAllRunsIdentical(records);

    // Sanity: the recorded order is the expected one — not "always the same
    // but always wrong" because of a shared bug.
    expect(records[0]!.activityCallOrder).toEqual(['A', 'B', 'C']);
    expect(records[0]!.statuses.at(-1)?.status).toBe('completed');
  });

  it('fan-out A→{B,C} — concurrent wave has positional Promise.all results across runs', async () => {
    // Promise.all resolves with results in input order. The runner reads
    // them positionally, so the recorded event sequence must be identical
    // even though B and C run concurrently.
    const input = makeInput([trigger('A'), trigger('B'), trigger('C')], [edge('e1', 'A', 'B'), edge('e2', 'A', 'C')]);

    const records = await runNTimes(input, {}, RUNS);
    expectAllRunsIdentical(records);

    // Activity call order within a wave is the iteration order of `ready`,
    // which is built from definition.nodes — deterministic.
    expect(records[0]!.activityCallOrder).toEqual(['A', 'B', 'C']);
  });

  it('diamond A→{B,C}→D — fan-in join sees both upstreams in deterministic order', async () => {
    const input = makeInput(
      [trigger('A'), trigger('B'), trigger('C'), trigger('D')],
      [edge('e1', 'A', 'B'), edge('e2', 'A', 'C'), edge('e3', 'B', 'D'), edge('e4', 'C', 'D')],
    );

    const records = await runNTimes(input, {}, RUNS);
    expectAllRunsIdentical(records);
    expect(records[0]!.activityCallOrder.at(-1)).toBe('D');
  });

  it('decision routing — pruned branch is consistently skipped, never alternately taken', async () => {
    // The pruning decision in `propagate` comes from `nextPort` (data) and
    // `sourceHandle` (data) — both injected, no randomness possible. Pin it.
    const input = makeInput(
      [trigger('D'), trigger('B'), trigger('C')],
      [edge('e1', 'D', 'B', 'X'), edge('e2', 'D', 'C', 'Y')],
    );

    const records = await runNTimes(input, { D: { output: { matchedBranch: 'X' }, nextPort: 'X' } }, RUNS);
    expectAllRunsIdentical(records);
    expect(records[0]!.activityCallOrder).toEqual(['D', 'B']);
  });

  it('node failure — failure path is deterministic too (same error code, same event sequence)', async () => {
    // The catch branch builds errorPayload from the thrown error. Across
    // replays the activity returns the same error (cached in history), so
    // the same payload must surface. Pin it.
    const input = makeInput([trigger('A'), trigger('B'), trigger('C')], [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')]);

    const records = await runNTimes(input, { B: { throws: { message: 'slow down', code: 'rate_limited' } } }, RUNS);
    expectAllRunsIdentical(records);

    const nodeFailed = records[0]!.events.find((event) => event.type === 'node_failed' && event.nodeId === 'B');
    expect(nodeFailed?.payload).toEqual({ error: { message: 'slow down', code: 'rate_limited' } });
    expect(records[0]!.statuses.at(-1)?.status).toBe('failed');
  });

  it('stalled cycle — execution_failed event payload is identical across runs', async () => {
    // Stall detection iterates `state.pendingPredecessors` (a Map). Map
    // iteration order is spec-deterministic, but a future regression that
    // switched to Set or to Object.keys (no longer Map) could re-order the
    // stalled-nodes list and change the message. Pin both.
    const input = makeInput(
      [trigger('A'), trigger('B'), trigger('C')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'C', 'B')],
    );

    const records = await runNTimes(input, {}, RUNS);
    expectAllRunsIdentical(records);

    const failed = records[0]!.events.find((event) => event.type === 'execution_failed');
    expect((failed?.payload as { error: { message: string } } | undefined)?.error.message).toMatch(/Workflow stalled/);
  });

  it('asymmetric fan-in — depth-mismatched join waits for both, every run', async () => {
    // The scheduler's job is exactly this case (B depth 1, Aprime depth 2,
    // join at C). Replay determinism here doubles as a regression pin for
    // the scheduling algorithm.
    const input = makeInput(
      [trigger('A'), trigger('Aprime'), trigger('B'), trigger('C')],
      [edge('e1', 'A', 'Aprime'), edge('e2', 'Aprime', 'C'), edge('e3', 'B', 'C')],
    );

    const records = await runNTimes(input, {}, RUNS);
    expectAllRunsIdentical(records);
    expect(records[0]!.activityCallOrder.at(-1)).toBe('C');
  });
});

import { describe, expect, it } from 'vitest';

import {
  type ActivityRunnerPort,
  type BaseNode,
  type WorkflowExecutionInput,
  runGraph,
} from '@workflow-builder/execution-core/workflow';

import { type EventPersistence, createSequencedEventEmitter } from './sequenced-event-emitter';

type TestNode = BaseNode & { type: 'test/node' };

type Recorded = { sequence: number; type: string; nodeId?: string };

// Records what reached persistence. `trace` logs entry and exit of each write so a
// test can tell serialized writes from overlapping ones. `failAt` rejects the write
// carrying that sequence number, standing in for an emitEvent that exhausted its
// Temporal retries.
function makePersistence(options: { failAt?: number } = {}): {
  persistence: EventPersistence;
  recorded: Recorded[];
  trace: string[];
} {
  const recorded: Recorded[] = [];
  const trace: string[] = [];
  return {
    recorded,
    trace,
    persistence: {
      async emitEvent(_executionId, sequence, type, _payload, nodeId) {
        trace.push(`start:${sequence}`);
        // Lower sequence numbers take *more* microtask turns, so if these writes ever
        // ran concurrently they would finish in descending order — the exact inversion
        // the SSE cursor cannot survive. Deterministic (no timers, no randomness), so
        // it is replay-safe and stable across runs.
        for (let turn = 0; turn < Math.max(1, 16 - sequence); turn++) {
          await Promise.resolve();
        }
        if (options.failAt === sequence) {
          trace.push(`fail:${sequence}`);
          throw new Error(`insert failed at ${sequence}`);
        }
        recorded.push({ sequence, type, nodeId });
        trace.push(`end:${sequence}`);
      },
      async updateStatus() {
        await Promise.resolve();
      },
    },
  };
}

function node(id: string): TestNode {
  return { id, type: 'test/node', config: {} };
}

function startNode(id: string): TestNode {
  return { id, type: 'test/node', config: {}, role: 'start' };
}

type TestEdge = WorkflowExecutionInput<TestNode>['definition']['edges'][number];

function edge(id: string, source: string, target: string): TestEdge {
  return { id, sourceNodeId: source, targetNodeId: target };
}

function makeInput(nodes: TestNode[], edges: TestEdge[]): WorkflowExecutionInput<TestNode> {
  return {
    workflowId: 'wf-1',
    executionId: 'exec-1',
    definition: { workflowId: 'wf-1', nodes, edges },
    triggerPayload: {},
    variables: {},
    global: {},
  };
}

const runner: ActivityRunnerPort<TestNode> = {
  async executeNode(target) {
    // A real node awaits an activity; yielding here lets the whole wave suspend
    // together rather than each node running to completion in turn.
    await Promise.resolve();
    return { output: `out-${target.id}` };
  },
};

// A→{B,C,D}→E: one four-wide wave, so four node_started emits are in flight at once.
function fanOutGraph(): WorkflowExecutionInput<TestNode> {
  return makeInput(
    [startNode('A'), node('B'), node('C'), node('D'), node('E')],
    [
      edge('e1', 'A', 'B'),
      edge('e2', 'A', 'C'),
      edge('e3', 'A', 'D'),
      edge('e4', 'B', 'E'),
      edge('e5', 'C', 'E'),
      edge('e6', 'D', 'E'),
    ],
  );
}

describe('createSequencedEventEmitter', () => {
  it('numbers from 1 upward — the SSE cursor starts at 0 and queries sequence > cursor', async () => {
    const { persistence, recorded } = makePersistence();
    const events = createSequencedEventEmitter(persistence);

    await events.emitEvent('exec-1', 'execution_started');

    expect(recorded).toEqual([{ sequence: 1, type: 'execution_started', nodeId: undefined }]);
  });

  it('assigns distinct, call-ordered numbers to emits that overlap', async () => {
    const { persistence, recorded } = makePersistence();
    const events = createSequencedEventEmitter(persistence);

    await Promise.all([
      events.emitEvent('exec-1', 'node_started', undefined, 'B'),
      events.emitEvent('exec-1', 'node_started', undefined, 'C'),
      events.emitEvent('exec-1', 'node_started', undefined, 'D'),
    ]);

    expect(recorded.map((entry) => entry.sequence)).toEqual([1, 2, 3]);
    expect(recorded.map((entry) => entry.nodeId)).toEqual(['B', 'C', 'D']);
  });

  it('gives every event of a parallel wave its own number', async () => {
    const { persistence, recorded } = makePersistence();

    await runGraph(fanOutGraph(), runner, createSequencedEventEmitter(persistence));

    // 1 execution_started + 5 nodes x (started + completed) + 1 execution_completed
    expect(recorded).toHaveLength(12);
    const sequences = recorded.map((entry) => entry.sequence);
    expect(new Set(sequences).size).toBe(sequences.length);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
  });

  it('produces byte-identical numbering across repeated runs of the same graph', async () => {
    // Replay equivalence for the numbers specifically: Temporal replays the emit
    // order from history, so identical emit order must yield identical numbers.
    const fingerprints: string[] = [];
    for (let run = 0; run < 10; run++) {
      const { persistence, recorded } = makePersistence();
      await runGraph(fanOutGraph(), runner, createSequencedEventEmitter(persistence));
      fingerprints.push(JSON.stringify(recorded));
    }

    for (let run = 1; run < fingerprints.length; run++) {
      expect(fingerprints[run], `run ${run} diverged from run 0`).toBe(fingerprints[0]);
    }
  });

  // The backend SSE drain advances a monotonic cursor over `sequence > cursor`, so a
  // row committing after a higher-numbered one has already moved the cursor is never
  // delivered. These pin the writer-side half of that contract.
  it('never has two writes in flight at once, even when the caller emits concurrently', async () => {
    const { persistence, trace } = makePersistence();
    const events = createSequencedEventEmitter(persistence);

    await Promise.all([
      events.emitEvent('exec-1', 'node_started', undefined, 'B'),
      events.emitEvent('exec-1', 'node_started', undefined, 'C'),
      events.emitEvent('exec-1', 'node_started', undefined, 'D'),
    ]);

    // Strictly start/end paired — never start:2 before end:1.
    expect(trace).toEqual(['start:1', 'end:1', 'start:2', 'end:2', 'start:3', 'end:3']);
  });

  it('commits a whole parallel wave in ascending sequence order', async () => {
    const { persistence, trace } = makePersistence();

    await runGraph(fanOutGraph(), runner, createSequencedEventEmitter(persistence));

    const commitOrder = trace.filter((entry) => entry.startsWith('end:')).map((entry) => Number(entry.slice(4)));
    expect(commitOrder).toEqual([...commitOrder].sort((a, b) => a - b));
    expect(commitOrder).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  // Chain-poisoning: `tail = write` would make one rejection skip the onFulfilled of
  // every later link, silently dropping the rest of the run's events.
  it('keeps emitting after a failed write — one rejection does not poison the chain', async () => {
    const { persistence, recorded } = makePersistence({ failAt: 2 });
    const events = createSequencedEventEmitter(persistence);

    await events.emitEvent('exec-1', 'execution_started');
    await expect(events.emitEvent('exec-1', 'node_started', undefined, 'B')).rejects.toThrow('insert failed at 2');
    await events.emitEvent('exec-1', 'node_started', undefined, 'C');
    await events.emitEvent('exec-1', 'node_completed', { output: 'x' }, 'C');

    // 2 is a permanent gap; everything after it still lands, still ascending.
    expect(recorded.map((entry) => entry.sequence)).toEqual([1, 3, 4]);
  });

  it('surfaces the failure to the caller so it can reach the error policy', async () => {
    // The emitter must not swallow: runNode's catch is what applies errorPolicy.
    const { persistence } = makePersistence({ failAt: 1 });
    const events = createSequencedEventEmitter(persistence);

    await expect(events.emitEvent('exec-1', 'node_started', undefined, 'B')).rejects.toThrow('insert failed at 1');
  });

  it('a run whose node_started emit fails still completes, with a gap and no reordering', async () => {
    // End to end through runGraph: errorPolicy 'continue' absorbs the failed emit,
    // the run carries on, and the surviving events stay in ascending commit order.
    const { persistence, recorded, trace } = makePersistence({ failAt: 4 });

    const outcome = await runGraph(
      makeInput(
        [startNode('A'), { ...node('B'), errorPolicy: 'continue' }, node('C')],
        [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
      ),
      runner,
      createSequencedEventEmitter(persistence),
    );

    expect(outcome).toEqual({ status: 'completed' });
    const commitOrder = trace.filter((entry) => entry.startsWith('end:')).map((entry) => Number(entry.slice(4)));
    expect(commitOrder).toEqual([...commitOrder].sort((a, b) => a - b));
    expect(recorded.map((entry) => entry.sequence)).not.toContain(4);
    expect(recorded.length).toBeGreaterThan(0);
  });

  it('keeps a separate counter per emitter so concurrent runs cannot share numbers', async () => {
    const first = makePersistence();
    const second = makePersistence();

    await runGraph(fanOutGraph(), runner, createSequencedEventEmitter(first.persistence));
    await runGraph(fanOutGraph(), runner, createSequencedEventEmitter(second.persistence));

    expect(second.recorded.map((entry) => entry.sequence)).toEqual(first.recorded.map((entry) => entry.sequence));
    expect(second.recorded[0]?.sequence).toBe(1);
  });
});

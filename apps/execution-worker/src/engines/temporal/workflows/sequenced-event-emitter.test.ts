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

// Records what reached persistence, and yields to the microtask queue before
// resolving so that concurrent emits from one wave genuinely overlap — a counter
// read across an await boundary would collide here.
function makePersistence(): { persistence: EventPersistence; recorded: Recorded[] } {
  const recorded: Recorded[] = [];
  return {
    recorded,
    persistence: {
      async emitEvent(_executionId, sequence, type, _payload, nodeId) {
        await Promise.resolve();
        recorded.push({ sequence, type, nodeId });
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
    [node('A'), node('B'), node('C'), node('D'), node('E')],
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

  it('keeps a separate counter per emitter so concurrent runs cannot share numbers', async () => {
    const first = makePersistence();
    const second = makePersistence();

    await runGraph(fanOutGraph(), runner, createSequencedEventEmitter(first.persistence));
    await runGraph(fanOutGraph(), runner, createSequencedEventEmitter(second.persistence));

    expect(second.recorded.map((entry) => entry.sequence)).toEqual(first.recorded.map((entry) => entry.sequence));
    expect(second.recorded[0]?.sequence).toBe(1);
  });
});

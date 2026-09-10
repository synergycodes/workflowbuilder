// Gate fixtures for the durable-pause tests. Executors record every invocation so
// the restart scenario can assert "downstream runs exactly once" across workers.
import type { BaseNode, NodeExecutorRegistry, WorkflowDefinition } from '../../src/index';
import type { RecordingStore } from './graph';

export type PauseTestNode = (BaseNode & { type: 'test/step' }) | (BaseNode & { type: 'test/gate' });

// start ─▶ gate ─▶ after
export const SINGLE_GATE_GRAPH: WorkflowDefinition<PauseTestNode> = {
  workflowId: 'pause-test-workflow',
  nodes: [
    { id: 'start', type: 'test/step', role: 'start', config: {} },
    { id: 'gate', type: 'test/gate', config: {} },
    { id: 'after', type: 'test/step', config: {} },
  ],
  edges: [
    { id: 'e-start-gate', sourceNodeId: 'start', targetNodeId: 'gate' },
    { id: 'e-gate-after', sourceNodeId: 'gate', targetNodeId: 'after' },
  ],
};

// start ─▶ gate ─(approved)─▶ after
//
// The one edge is port-tagged, so a verdict has to name `nextPort: 'approved'` to reach
// `after`; the untagged SINGLE_GATE_GRAPH would route there on any verdict.
export const PORT_ROUTED_GRAPH: WorkflowDefinition<PauseTestNode> = {
  workflowId: 'port-routed-workflow',
  nodes: [
    { id: 'start', type: 'test/step', role: 'start', config: {} },
    { id: 'gate', type: 'test/gate', config: {} },
    { id: 'after', type: 'test/step', config: {} },
  ],
  edges: [
    { id: 'e-start-gate', sourceNodeId: 'start', targetNodeId: 'gate' },
    { id: 'e-gate-after', sourceNodeId: 'gate', targetNodeId: 'after', sourceHandle: 'approved' },
  ],
};

// start ─┬─▶ gate-a ──┬─▶ join
//        └─▶ gate-b ──┘
export const TWO_GATES_GRAPH: WorkflowDefinition<PauseTestNode> = {
  workflowId: 'two-gates-workflow',
  nodes: [
    { id: 'start', type: 'test/step', role: 'start', config: {} },
    { id: 'gate-a', type: 'test/gate', config: {} },
    { id: 'gate-b', type: 'test/gate', config: {} },
    { id: 'join', type: 'test/step', config: {} },
  ],
  edges: [
    { id: 'e-start-a', sourceNodeId: 'start', targetNodeId: 'gate-a' },
    { id: 'e-start-b', sourceNodeId: 'start', targetNodeId: 'gate-b' },
    { id: 'e-a-join', sourceNodeId: 'gate-a', targetNodeId: 'join' },
    { id: 'e-b-join', sourceNodeId: 'gate-b', targetNodeId: 'join' },
  ],
};

function noop(): void {}

export type PauseHarness = {
  executors: NodeExecutorRegistry<PauseTestNode>;
  executed: string[];
  inputsSeen: Record<string, Record<string, unknown>>;
  release: () => void;
};

// `holdWaiting` keeps the waiting executor in flight until `release()`.
export function createPauseExecutors(options: { holdWaiting?: boolean } = {}): PauseHarness {
  const executed: string[] = [];
  const inputsSeen: PauseHarness['inputsSeen'] = {};
  let release: () => void = noop;
  const held = options.holdWaiting
    ? new Promise<void>((resolve) => {
        release = resolve;
      })
    : Promise.resolve();

  return {
    executed,
    inputsSeen,
    release: () => release(),
    executors: {
      'test/step': (node, context) => {
        executed.push(node.id);
        inputsSeen[node.id] = { ...context.nodeOutputs };
        return { output: { visited: node.id } };
      },
      'test/gate': async (node) => {
        executed.push(node.id);
        await held;
        return { waiting: true };
      },
    },
  };
}

export type HeldAnnouncement = { store: RecordingStore; release: () => void };

// Keeps the node_waiting activity in flight after the event is recorded, until `release()`,
// so a verdict can reach the workflow before that activity has returned.
export function holdAnnouncement(store: RecordingStore, nodeId: string): HeldAnnouncement {
  let release: () => void = noop;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  return {
    release: () => release(),
    store: {
      ...store,
      async emitExecutionEvent(executionId, sequence, type, payload, eventNodeId) {
        await store.emitExecutionEvent(executionId, sequence, type, payload, eventNodeId);
        if (type === 'node_waiting' && eventNodeId === nodeId) await held;
      },
    },
  };
}

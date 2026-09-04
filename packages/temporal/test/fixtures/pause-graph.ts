// Gate fixtures for the durable-pause tests. Executors record every invocation so
// the restart scenario can assert "downstream runs exactly once" across workers.
import type { BaseNode, NodeExecutorRegistry, WorkflowDefinition } from '../../src/index';

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

export type PauseHarness = {
  executors: NodeExecutorRegistry<PauseTestNode>;
  executed: string[];
  inputsSeen: Record<string, Record<string, unknown>>;
};

export function createPauseExecutors(): PauseHarness {
  const executed: string[] = [];
  const inputsSeen: PauseHarness['inputsSeen'] = {};

  return {
    executed,
    inputsSeen,
    executors: {
      'test/step': (node, context) => {
        executed.push(node.id);
        inputsSeen[node.id] = { ...context.nodeOutputs };
        return { output: { visited: node.id } };
      },
      'test/gate': (node) => {
        executed.push(node.id);
        return { waiting: true };
      },
    },
  };
}

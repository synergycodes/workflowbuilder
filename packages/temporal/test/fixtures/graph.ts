// The fan-out/fan-in shape exercises parallel-wave replay; keep the fixture deterministic.
import type { BaseNode, ExecutionStore, NodeExecutorRegistry, WorkflowDefinition } from '../../src/index';

export type ReplayTestNode = BaseNode & { type: 'test/step' };

export const REPLAY_TEST_WORKFLOW_ID = 'replay-test-workflow';

// start ─┬─▶ left ──┬─▶ join
//        └─▶ right ─┘
//
// Waves: [start] → [left, right] → [join].
export const REPLAY_TEST_GRAPH: WorkflowDefinition<ReplayTestNode> = {
  workflowId: REPLAY_TEST_WORKFLOW_ID,
  nodes: [
    { id: 'start', type: 'test/step', role: 'start', config: { label: 'start' } },
    { id: 'left', type: 'test/step', config: { label: 'left' } },
    { id: 'right', type: 'test/step', config: { label: 'right' } },
    { id: 'join', type: 'test/step', config: { label: 'join' } },
  ],
  edges: [
    { id: 'e-start-left', sourceNodeId: 'start', targetNodeId: 'left' },
    { id: 'e-start-right', sourceNodeId: 'start', targetNodeId: 'right' },
    { id: 'e-left-join', sourceNodeId: 'left', targetNodeId: 'join' },
    { id: 'e-right-join', sourceNodeId: 'right', targetNodeId: 'join' },
  ],
};

export const replayTestExecutors: NodeExecutorRegistry<ReplayTestNode> = {
  'test/step': (node, context) => {
    const upstream = Object.keys(context.nodeOutputs).sort();
    return { output: { visited: node.id, after: upstream } };
  },
};

export type RecordingStore = ExecutionStore & {
  events: { sequence: number; type: string; nodeId?: string; payload?: unknown }[];
  statuses: { status: string; errorMessage?: string }[];
};

export function createRecordingStore(): RecordingStore {
  const events: RecordingStore['events'] = [];
  const statuses: RecordingStore['statuses'] = [];

  return {
    events,
    statuses,
    async emitExecutionEvent(_executionId, sequence, type, payload, nodeId) {
      events.push({ sequence, type, nodeId, payload });
    },
    async updateExecutionStatus(_executionId, status, errorMessage) {
      statuses.push({ status, errorMessage });
    },
  };
}

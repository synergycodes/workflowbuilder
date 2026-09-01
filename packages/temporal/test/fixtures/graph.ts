// The graph the replay tests run and re-run. Deliberately shaped, not arbitrary:
// `start` fans out to two nodes that share a wave and then fan back in, so the run
// exercises the `Promise.all` the replay audit calls out as the one place the runner
// awaits more than one thing at a time. A straight line would replay green while
// leaving that path untested.
//
// Everything here is deterministic — fixed ids, fixed outputs, no clock, no random —
// because a recorded history is only worth committing if the same code produces the
// same history next time.
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

// One executor for the single node type. Reads its predecessors' outputs so the run
// proves data actually flows through the wave, and returns a value derived only from
// its input.
export const replayTestExecutors: NodeExecutorRegistry<ReplayTestNode> = {
  'test/step': (node, context) => {
    const upstream = Object.keys(context.nodeOutputs).sort();
    return { output: { visited: node.id, after: upstream } };
  },
};

export type RecordingStore = ExecutionStore & {
  events: { sequence: number; type: string; nodeId?: string }[];
  statuses: { status: string; errorMessage?: string }[];
};

// Records what the activities were asked to persist, so a test can assert on the run
// itself and not only on the shape of its history.
export function createRecordingStore(): RecordingStore {
  const events: RecordingStore['events'] = [];
  const statuses: RecordingStore['statuses'] = [];

  return {
    events,
    statuses,
    async emitExecutionEvent(_executionId, sequence, type, _payload, nodeId) {
      events.push({ sequence, type, nodeId });
    },
    async updateExecutionStatus(_executionId, status, errorMessage) {
      statuses.push({ status, errorMessage });
    },
  };
}

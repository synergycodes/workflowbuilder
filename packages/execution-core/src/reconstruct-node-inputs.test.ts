import { describe, expect, it } from 'vitest';

import { type NodeInputEventSource, reconstructNodeInputs } from './reconstruct-node-inputs';

const history: NodeInputEventSource[] = [
  { type: 'execution_started', payload: { workflowId: 'wf-1' } },
  { type: 'node_started', nodeId: 'A', payload: { config: {}, visibleNodeIds: [] } },
  { type: 'node_completed', nodeId: 'A', payload: { output: 'out-A' } },
  { type: 'node_started', nodeId: 'B', payload: { config: { x: 1 }, visibleNodeIds: ['A'] } },
  { type: 'node_failed', nodeId: 'B', payload: { error: { message: 'boom', code: 'llm_error' } } },
  { type: 'node_started', nodeId: 'C', payload: { config: {}, visibleNodeIds: ['A', 'B'] } },
];

describe('reconstructNodeInputs', () => {
  it('joins visible ids against completion payloads, using node_failed for absorbed errors', () => {
    expect(reconstructNodeInputs(history, 'C')).toEqual({
      config: {},
      nodeOutputs: { A: 'out-A', B: { error: { message: 'boom', code: 'llm_error' } } },
    });
  });

  it('returns undefined for a node with no node_started event', () => {
    expect(reconstructNodeInputs(history, 'Z')).toBeUndefined();
  });

  it('returns undefined for a node_started recorded before inputs were captured', () => {
    const legacy: NodeInputEventSource[] = [{ type: 'node_started', nodeId: 'A' }];

    expect(reconstructNodeInputs(legacy, 'A')).toBeUndefined();
  });

  it('skips a visible id whose completion event is missing from the slice', () => {
    const partial = history.filter((event) => !(event.type === 'node_completed' && event.nodeId === 'A'));

    expect(reconstructNodeInputs(partial, 'C')).toEqual({
      config: {},
      nodeOutputs: { B: { error: { message: 'boom', code: 'llm_error' } } },
    });
  });
});

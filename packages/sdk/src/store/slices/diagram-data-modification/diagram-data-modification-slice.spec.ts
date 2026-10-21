import { produce } from 'immer';
import { beforeEach, describe, expect, it } from 'vitest';

import '../../../bootstrap';
import type { WorkflowBuilderNode } from '../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../store';

const node: WorkflowBuilderNode = {
  id: 'n1',
  position: { x: 0, y: 0 },
  type: 'action',
  data: { type: 'action', icon: 'Plus', properties: {} },
};

beforeEach(() => {
  resetWorkflowStore();
  useStore.setState({ nodes: [node] });
});

describe('diagram data modification with the host app leaving immer auto-freeze on', () => {
  it('keeps nodes written by setNodeProperties extensible', () => {
    useStore.getState().setNodeProperties('n1', { schema: { type: 'object' } });

    const [updated] = useStore.getState().nodes;
    const schema = updated.data.properties.schema as Record<string, unknown>;

    expect(Object.isFrozen(updated)).toBe(false);
    expect(Object.isFrozen(updated.position)).toBe(false);
    expect(() => {
      schema.__absolute_uri__ = 'urn:test';
    }).not.toThrow();
  });

  it('keeps nodes written by setNodeData extensible', () => {
    useStore.getState().setNodeData('n1', { ...node.data, label: 'renamed' });

    expect(Object.isFrozen(useStore.getState().nodes[0].data)).toBe(false);
  });

  it('leaves the global auto-freeze setting on after the SDK loads and writes', () => {
    useStore.getState().setNodeData('n1', { ...node.data, label: 'renamed' });

    expect(Object.isFrozen(produce({ value: 1 }, (draft) => void (draft.value = 2)))).toBe(true);
  });
});

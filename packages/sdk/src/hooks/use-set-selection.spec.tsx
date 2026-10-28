import { act, render } from '@testing-library/react';
import { ReactFlow, ReactFlowProvider, useStoreApi } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../node/node-data';
import { useStore } from '../store/store';
import { type SelectionIds, useSetSelection } from './use-set-selection';

vi.mock('@/features/changes-tracker/stores/use-changes-tracker-store', () => ({
  trackFutureChange: vi.fn(),
}));

const node = (id: string, selected = false) =>
  ({ id, position: { x: 0, y: 0 }, data: {}, selected }) as unknown as WorkflowBuilderNode;

function selectedIds() {
  const { selectedNodesIds, selectedEdgesIds } = useStore.getState();
  return { nodes: [...selectedNodesIds].sort(), edges: [...selectedEdgesIds].sort() };
}

let setSelection: ((selection: SelectionIds) => boolean) | undefined;
let reactFlowStore: ReturnType<typeof useStoreApi<WorkflowBuilderNode, WorkflowBuilderEdge>> | undefined;

function Probe() {
  setSelection = useSetSelection();
  reactFlowStore = useStoreApi<WorkflowBuilderNode, WorkflowBuilderEdge>();
  return null;
}

// As the canvas mounts it: React Flow controlled by the SDK store, so a selection travels through
// `onNodesChange` into the store and back out through `onSelectionChange`.
function Canvas() {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const onNodesChange = useStore((state) => state.onNodesChange);
  const onEdgesChange = useStore((state) => state.onEdgesChange);
  const onSelectionChange = useStore((state) => state.onSelectionChange) as (params: unknown) => void;
  return (
    <ReactFlow<WorkflowBuilderNode, WorkflowBuilderEdge>
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onSelectionChange={onSelectionChange}
    />
  );
}

function select(selection: SelectionIds) {
  let isSelected: boolean | undefined;
  act(() => {
    isSelected = setSelection!(selection);
  });
  return isSelected;
}

beforeEach(() => {
  // jsdom has none, and React Flow's pane observes its own size as it mounts.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  useStore.setState({
    nodes: [node('human-1'), node('a', true), node('b', true)],
    edges: [{ id: 'e1', source: 'a', target: 'b' }],
    selectedNodesIds: ['a', 'b'],
    selectedEdgesIds: [],
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useSetSelection without a canvas', () => {
  it('selects nothing, since there is no node to select', () => {
    render(
      <ReactFlowProvider>
        <Probe />
      </ReactFlowProvider>,
    );

    expect(select({ nodeIds: ['a'] })).toBe(false);
  });
});

describe('useSetSelection', () => {
  beforeEach(() => {
    render(
      <ReactFlowProvider>
        <div style={{ width: 800, height: 600 }}>
          <Canvas />
        </div>
        <Probe />
      </ReactFlowProvider>,
    );
  });

  it("replaces a group's selection with one node and drops the group's selection box, as a click does", () => {
    act(() => reactFlowStore!.setState({ nodesSelectionActive: true }));

    expect(select({ nodeIds: ['human-1'] })).toBe(true);

    expect(selectedIds()).toEqual({ nodes: ['human-1'], edges: [] });
    expect(reactFlowStore!.getState().nodesSelectionActive).toBe(false);
  });

  it('replaces the selection even while the multi-selection key is held', () => {
    act(() => reactFlowStore!.setState({ multiSelectionActive: true }));

    select({ nodeIds: ['human-1'] });

    expect(selectedIds()).toEqual({ nodes: ['human-1'], edges: [] });
  });

  it('selects nodes and edges together', () => {
    expect(select({ nodeIds: ['human-1', 'a'], edgeIds: ['e1'] })).toBe(true);

    expect(selectedIds()).toEqual({ nodes: ['a', 'human-1'], edges: ['e1'] });
  });

  it('lets the last of two calls in one tick win', () => {
    act(() => {
      setSelection!({ nodeIds: ['human-1'] });
      setSelection!({ nodeIds: ['a'] });
    });

    expect(selectedIds()).toEqual({ nodes: ['a'], edges: [] });
  });

  it('clears the selection on an empty call', () => {
    expect(select({})).toBe(true);

    expect(selectedIds()).toEqual({ nodes: [], edges: [] });
  });

  it.each([
    ['a node', { nodeIds: ['human-1', 'missing'] }],
    ['an edge', { nodeIds: ['human-1'], edgeIds: ['missing'] }],
  ])('changes nothing when the canvas lacks %s it names', (_name, selection) => {
    expect(select(selection)).toBe(false);

    expect(selectedIds()).toEqual({ nodes: ['a', 'b'], edges: [] });
  });
});

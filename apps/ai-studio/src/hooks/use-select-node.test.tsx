import { type Node, ReactFlowProvider, useStoreApi } from '@xyflow/react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSelectNode } from './use-select-node';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useSelectNode', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let reactFlowStore: ReturnType<typeof useStoreApi> | undefined;
  let selectNode: ((nodeId: string) => void) | undefined;

  function Probe() {
    reactFlowStore = useStoreApi();
    selectNode = useSelectNode();
    return null;
  }

  beforeEach(() => {
    const nodes: Node[] = [
      { id: 'human-1', position: { x: 0, y: 0 }, data: {} },
      { id: 'a', position: { x: 300, y: 0 }, data: {}, selected: true },
      { id: 'b', position: { x: 600, y: 0 }, data: {}, selected: true },
    ];
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <ReactFlowProvider defaultNodes={nodes}>
          <Probe />
        </ReactFlowProvider>,
      ),
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("replaces a group's selection with the one node and drops the group's selection box, as a click does", () => {
    act(() => reactFlowStore?.setState({ nodesSelectionActive: true }));

    act(() => selectNode?.('human-1'));

    const selected = reactFlowStore
      ?.getState()
      .nodes.filter((node) => node.selected)
      .map((node) => node.id);
    expect(selected).toEqual(['human-1']);
    expect(reactFlowStore?.getState().nodesSelectionActive).toBe(false);
  });
});

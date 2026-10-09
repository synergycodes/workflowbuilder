import { useStore } from '@workflowbuilder/sdk';
import { type Node, ReactFlowProvider, type ReactFlowState, useStoreApi } from '@xyflow/react';
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { executionEvent as event } from '../stores/execution-event.fixture';
import { applyEvent, resetExecution, setExecutionStarted } from '../stores/use-execution-store';
import { nodeEvent } from '../test/execution-history';
import { useRunCollapsesSidePanels } from './use-run-collapses-side-panels';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const isLibraryOpen = () => useStore.getState().isSidebarExpanded;
const startRun = (id = 'exec-1') => act(() => setExecutionStarted(id, `/api/executions/${id}/stream`));

describe('useRunCollapsesSidePanels', () => {
  let root: ReturnType<typeof createRoot>;
  let reactFlowStore: { getState: () => ReactFlowState } | undefined;
  let flowNodes: Node[];

  const selectedOnCanvas = () =>
    reactFlowStore
      ?.getState()
      .nodes.filter((node) => node.selected)
      .map((node) => node.id);
  const clickNode = (id: string) =>
    act(() => {
      reactFlowStore?.getState().unselectNodesAndEdges();
      reactFlowStore?.getState().triggerNodeChanges([{ id, type: 'select', selected: true }]);
    });

  function Probe() {
    reactFlowStore = useStoreApi();
    useRunCollapsesSidePanels();
    return null;
  }

  function mount() {
    root = createRoot(document.createElement('div'));
    act(() =>
      root.render(
        <StrictMode>
          <ReactFlowProvider defaultNodes={flowNodes}>
            <Probe />
          </ReactFlowProvider>
        </StrictMode>,
      ),
    );
  }

  beforeEach(() => {
    resetExecution();
    flowNodes = [
      { id: 'ai', position: { x: 0, y: 0 }, data: {}, selected: true },
      { id: 'email', position: { x: 300, y: 0 }, data: {} },
    ];
    useStore.getState().toggleSidebar(true);
  });

  afterEach(() => {
    act(() => root.unmount());
    useStore.getState().toggleSidebar(false);
  });

  it('changes nothing while no run is shown', () => {
    mount();

    expect(isLibraryOpen()).toBe(true);
    expect(selectedOnCanvas()).toEqual(['ai']);
  });

  it('collapses the library and clears the selection when a run starts', () => {
    mount();
    startRun();

    expect(isLibraryOpen()).toBe(false);
    expect(selectedOnCanvas()).toEqual([]);
  });

  it('leaves panels the person reopened during the run open through later run events', () => {
    mount();
    startRun();

    act(() => useStore.getState().toggleSidebar(true));
    clickNode('email');
    act(() => applyEvent(nodeEvent('node_started', 'ai')));
    act(() => applyEvent(nodeEvent('node_waiting', 'ai')));
    act(() => applyEvent(event({ type: 'execution_completed', payload: undefined })));

    expect(isLibraryOpen()).toBe(true);
    expect(selectedOnCanvas()).toEqual(['email']);
  });

  it('brings the library and the selection back on Reset', () => {
    mount();
    startRun();
    act(() => resetExecution());

    expect(isLibraryOpen()).toBe(true);
    expect(selectedOnCanvas()).toEqual(['ai']);
  });

  it('a second run before Reset keeps the panels from before the first run', () => {
    mount();
    startRun('exec-1');
    startRun('exec-2');
    act(() => resetExecution());

    expect(isLibraryOpen()).toBe(true);
    expect(selectedOnCanvas()).toEqual(['ai']);
  });

  it('collapses for a run already in the store when the hook mounts', () => {
    startRun();
    mount();

    expect(isLibraryOpen()).toBe(false);
    expect(selectedOnCanvas()).toEqual([]);
  });

  it('restores the library on Reset even when the node selected before the run is gone', () => {
    mount();
    startRun();
    act(() => reactFlowStore?.getState().setNodes([{ id: 'email', position: { x: 300, y: 0 }, data: {} }]));
    act(() => resetExecution());

    expect(isLibraryOpen()).toBe(true);
    expect(selectedOnCanvas()).toEqual([]);
  });

  it('keeps what the person opened during the run open on Reset', () => {
    act(() => useStore.getState().toggleSidebar(false));
    mount();
    startRun();
    act(() => useStore.getState().toggleSidebar(true));
    clickNode('email');
    act(() => resetExecution());

    expect(isLibraryOpen()).toBe(true);
    expect(selectedOnCanvas()).toEqual(['email']);
  });

  it('keeps a library that was closed before the run closed on Reset', () => {
    act(() => useStore.getState().toggleSidebar(false));
    mount();
    startRun();
    act(() => resetExecution());

    expect(isLibraryOpen()).toBe(false);
  });

  it('a second Run and Reset bring back the panels from between the runs', () => {
    mount();
    startRun('exec-1');
    act(() => resetExecution());
    act(() => useStore.getState().toggleSidebar(false));
    clickNode('email');
    startRun('exec-2');
    act(() => resetExecution());

    expect(isLibraryOpen()).toBe(false);
    expect(selectedOnCanvas()).toEqual(['email']);
  });

  it('restores the selected nodes still on the canvas on Reset', () => {
    flowNodes = flowNodes.map((node) => ({ ...node, selected: true }));
    mount();
    startRun();
    act(() => reactFlowStore?.getState().setNodes([{ id: 'email', position: { x: 300, y: 0 }, data: {} }]));
    act(() => resetExecution());

    expect(selectedOnCanvas()).toEqual(['email']);
  });
});

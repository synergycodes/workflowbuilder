import { useStore } from '@workflowbuilder/sdk';
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { executionEvent as event } from '../stores/execution-event.fixture';
import { applyEvent, resetExecution, setExecutionStarted } from '../stores/use-execution-store';
import { nodeEvent } from '../test/execution-history';
import { useRunFitsCanvas } from './use-run-fits-canvas';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const panels = () => {
  const { isPaletteOpen, isPropertiesPanelOpen } = useStore.getState();
  return { library: isPaletteOpen, properties: isPropertiesPanelOpen };
};
const openLibrary = (open: boolean) => act(() => useStore.getState().setPaletteOpen(open));
const openProperties = (open: boolean) => act(() => useStore.getState().setPropertiesPanelOpen(open));
const selectedInSdk = () => useStore.getState().selectedNodesIds;
const startRun = (id = 'exec-1') => act(() => setExecutionStarted(id, `/api/executions/${id}/stream`));
const reset = () => act(() => resetExecution());

type ReactFlowInstance = NonNullable<ReturnType<typeof useStore.getState>['reactFlowInstance']>;
const fitView = vi.fn();
const reactFlowInstance = { fitView, getZoom: () => 1 } as unknown as ReactFlowInstance;
const setReactFlowInstance = (instance: ReactFlowInstance | null) =>
  act(() => useStore.setState({ reactFlowInstance: instance }));

function Probe() {
  useRunFitsCanvas();
  return null;
}

describe('useRunFitsCanvas', () => {
  let root: ReturnType<typeof createRoot>;

  function mount() {
    root = createRoot(document.createElement('div'));
    act(() =>
      root.render(
        <StrictMode>
          <Probe />
        </StrictMode>,
      ),
    );
  }

  beforeEach(() => {
    // The SDK fits in the next frame; here the frame is now.
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    fitView.mockClear();
    resetExecution();
    useStore.setState({
      isPaletteOpen: true,
      isPropertiesPanelOpen: true,
      selectedNodesIds: ['ai'],
      reactFlowInstance,
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    useStore.setState({
      isPaletteOpen: false,
      isPropertiesPanelOpen: true,
      selectedNodesIds: [],
      reactFlowInstance: null,
    });
    vi.unstubAllGlobals();
  });

  it('changes nothing while no run is shown', () => {
    mount();

    expect(panels()).toEqual({ library: true, properties: true });
    expect(selectedInSdk()).toEqual(['ai']);
    expect(fitView).not.toHaveBeenCalled();
  });

  it('collapses both panels, keeps the selection and fits the diagram when a run starts', () => {
    mount();
    startRun();

    expect(panels()).toEqual({ library: false, properties: false });
    expect(selectedInSdk()).toEqual(['ai']);
    expect(fitView).toHaveBeenCalledTimes(1);
  });

  it('fits the diagram once the canvas is ready for a run opened before it', () => {
    setReactFlowInstance(null);
    startRun();
    mount();
    expect(fitView).not.toHaveBeenCalled();

    setReactFlowInstance(reactFlowInstance);

    expect(fitView).toHaveBeenCalledTimes(1);
  });

  it('fits the diagram for a second run, and not on Reset', () => {
    mount();
    startRun('exec-1');
    startRun('exec-2');
    reset();

    expect(fitView).toHaveBeenCalledTimes(2);
  });

  it('leaves panels the person reopened during the run open through later run events', () => {
    mount();
    startRun();

    openLibrary(true);
    openProperties(true);
    act(() => applyEvent(nodeEvent('node_started', 'ai')));
    act(() => applyEvent(nodeEvent('node_waiting', 'ai')));
    act(() => applyEvent(event({ type: 'execution_completed', payload: undefined })));

    expect(panels()).toEqual({ library: true, properties: true });
  });

  it('brings both panels back on Reset', () => {
    mount();
    startRun();
    reset();

    expect(panels()).toEqual({ library: true, properties: true });
  });

  it('a second run before Reset keeps the panels from before the first run', () => {
    mount();
    startRun('exec-1');
    startRun('exec-2');
    reset();

    expect(panels()).toEqual({ library: true, properties: true });
  });

  it('collapses for a run already in the store when the hook mounts', () => {
    startRun();
    mount();

    expect(panels()).toEqual({ library: false, properties: false });
  });

  it('keeps what the person opened during the run open on Reset', () => {
    openLibrary(false);
    openProperties(false);
    mount();
    startRun();
    openLibrary(true);
    openProperties(true);
    reset();

    expect(panels()).toEqual({ library: true, properties: true });
  });

  it('keeps a panel that was closed before the run closed on Reset', () => {
    openLibrary(false);
    openProperties(false);
    mount();
    startRun();
    reset();

    expect(panels()).toEqual({ library: false, properties: false });
  });

  it('a second Run and Reset bring back the panels from between the runs', () => {
    mount();
    startRun('exec-1');
    reset();
    openLibrary(false);
    startRun('exec-2');
    reset();

    expect(panels()).toEqual({ library: false, properties: true });
  });
});

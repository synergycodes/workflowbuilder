import { useStore } from '@workflowbuilder/sdk';
import { type ComponentProps, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionStatus } from '@workflow-builder/types/workflow-execution/execution-events';

import styles from './ai-studio-controls.module.css';

import { BACKEND_URL } from '../../config';
import { supportTriageFlow } from '../../data/support-triage-flow';
import {
  applyConnectionLost,
  applySnapshot,
  applyStopRequested,
  resetExecution,
  setExecutionStarted,
  useExecutionStore,
} from '../../stores/use-execution-store';
import { useNoticesStore } from '../../stores/use-notices-store';
import { cancelledEvent, snapshotFrame } from '../../test/execution-history';
import { installFakeEventSource, latestStream, openStreams } from '../../test/fake-event-source';
import { jsonResponse } from '../../test/json-response';
import { AiStudioControls } from './ai-studio-controls';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

const address = vi.hoisted(() => ({ leaveRunView: vi.fn() }));
vi.mock('../../utils/open-from-url/address-execution-id', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/open-from-url/address-execution-id')>()),
  leaveRunView: address.leaveRunView,
}));

const startNode = vi.hoisted(() => ({ exists: true }));
vi.mock('../../hooks/use-has-start-node', () => ({ useHasStartNode: () => startNode.exists }));

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setRunStatus(status: ExecutionStatus) {
  act(() => applySnapshot(snapshotFrame(status, [])));
}

describe('AiStudioControls', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    installFakeEventSource();
    fetchMock = vi.fn(async () => jsonResponse(200, { id: 'exec-1', status: 'cancelling' }));
    vi.stubGlobal('fetch', fetchMock);
    resetExecution();
    startNode.exists = true;
    useNoticesStore.setState({ notices: [] });
    address.leaveRunView.mockClear();
    useStore.getState().setToggleReadOnlyMode(false);
    useStore.setState({ nodes: [], edges: [] });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    render();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const render = (props: Partial<ComponentProps<typeof AiStudioControls>> = {}) =>
    act(() => root.render(<AiStudioControls isRunView={false} {...props} />));

  const icons = () => [...container.querySelectorAll<HTMLElement>('[data-icon]')].map((icon) => icon.dataset['icon']);

  const clickIcon = (name: string) =>
    act(async () => {
      container.querySelector<HTMLElement>(`[data-icon="${name}"]`)?.closest('button')?.click();
    });

  const clickStop = () => clickIcon('Stop');
  const clickReset = () => clickIcon('ArrowCounterClockwise');

  const buttonOf = (name: string) => container.querySelector(`[data-icon="${name}"]`)?.closest('button');

  const labelOf = (name: string) => buttonOf(name)?.getAttribute('aria-label');

  const isVisible = () => container.firstElementChild?.classList.contains(styles['container--visible']!);

  const deleteStartNode = () => {
    startNode.exists = false;
    render();
  };

  // The words on Run and Stop are their names; an aria-label would replace what a person reads.
  it('names Run and Stop by the words on them', () => {
    expect(buttonOf('Play')?.textContent).toBe('Run');
    expect(labelOf('Play')).toBeNull();

    setRunStatus('running');
    expect(buttonOf('Stop')?.textContent).toBe('Stop');
    expect(labelOf('Stop')).toBeNull();
  });

  it('offers Stop while the run waits for a decision, the same as while it starts or runs', () => {
    setRunStatus('pending');
    expect(icons()).toEqual(['Stop']);

    setRunStatus('running');
    expect(icons()).toEqual(['Stop']);

    setRunStatus('waiting');
    expect(icons()).toEqual(['Stop']);
  });

  it('offers Stop as soon as Run is pressed, so a second start cannot follow before the backend answers', async () => {
    const request = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', request);
    setRunStatus('completed');
    expect(icons()).toEqual(['Play', 'ArrowCounterClockwise']);

    await clickIcon('Play');

    expect(icons()).toEqual(['Stop']);
    expect(buttonOf('Stop')?.disabled).toBe(true);
    await clickStop();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('offers Run again after a start the backend refused', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(503, { message: 'Unavailable' }));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    await clickIcon('Play');

    expect(logged).toHaveBeenCalled();
    expect(icons()).toEqual(['Play']);
  });

  it('tells the user why a start failed', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(503, { message: 'Unavailable' }));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await clickIcon('Play');

    expect(useNoticesStore.getState().notices.map((notice) => notice.text)).toEqual([
      'The run did not start: Unavailable.',
    ]);
  });

  it("Run on the link's workflow saves into that workflow first", async () => {
    const workflow = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';
    render({ workflowId: workflow });

    await clickIcon('Play');

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BACKEND_URL}/api/workflows/${workflow}/draft`);
  });

  it("Run saves the editor's clean shape, which autosave compares against, and still reads the prompt", async () => {
    const start = supportTriageFlow.value.diagram.nodes.find((node) => node.data.isStartNode)!;
    useStore.setState({
      nodes: [{ ...start, selected: true, dragging: true, measured: { width: 200, height: 80 } }],
      edges: [],
    });
    render({ workflowId: '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11' });

    await clickIcon('Play');

    const [draft, execute] = fetchMock.mock.calls;
    expect(JSON.parse(String(draft?.[1]?.body)).draftJson.nodes).toEqual([{ ...start, selected: false }]);
    expect(JSON.parse(String(execute?.[1]?.body)).triggerPayload).toEqual({
      input: (start.data.properties as { inputPrompt: string }).inputPrompt,
    });
  });

  it("Run sends a JSON trigger's fields beside the raw text", async () => {
    const start = supportTriageFlow.value.diagram.nodes.find((node) => node.data.isStartNode)!;
    const inputPrompt = '{ "orderId": "ORD-1" }';
    useStore.setState({
      nodes: [{ ...start, data: { ...start.data, properties: { ...start.data.properties, inputPrompt } } }],
      edges: [],
    });
    render({ workflowId: '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11' });

    await clickIcon('Play');

    const [, execute] = fetchMock.mock.calls;
    expect(JSON.parse(String(execute?.[1]?.body)).triggerPayload).toEqual({ orderId: 'ORD-1', input: inputPrompt });
  });

  // The canvas holds the run's graph, which is saved nowhere; running it again is a feature of its own.
  it.each([
    ['under a workflow link', { isRunView: true, workflowId: '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11' }],
    ['on its own', { isRunView: true }],
  ])('offers no Run in a run view %s, only Reset', (_, props) => {
    render(props);
    setRunStatus('completed');

    expect(icons()).toEqual(['ArrowCounterClockwise']);
  });

  it('adds Reset once a cancel is in flight: a cancel the server never resolves would trap the user', () => {
    act(() => applySnapshot(snapshotFrame('cancelling')));

    expect(icons()).toEqual(['Stop', 'ArrowCounterClockwise']);
  });

  it('offers Stop, and no Reset, after the stream was lost: the run may still be alive on the server', () => {
    setRunStatus('waiting');
    act(() => applyConnectionLost());

    expect(icons()).toEqual(['Stop']);
  });

  it('Stop after a lost stream still asks the server to cancel', async () => {
    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    setRunStatus('waiting');
    act(() => applyConnectionLost());

    await clickStop();

    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND_URL}/api/executions/exec-1`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('offers Play and Reset once the run has ended', () => {
    setRunStatus('waiting');
    setRunStatus('completed');

    expect(icons()).toEqual(['Play', 'ArrowCounterClockwise']);
  });

  it('adds Reset alongside Stop once a Stop was asked for after a lost stream: the user is never trapped', () => {
    setRunStatus('waiting');
    act(() => applyConnectionLost());
    act(() => applyStopRequested());

    expect(icons()).toEqual(['Stop', 'ArrowCounterClockwise']);
  });

  it('that Reset clears the canvas and asks the server nothing: it abandons the run, it does not cancel it', async () => {
    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    setRunStatus('waiting');
    act(() => applyConnectionLost());
    act(() => applyStopRequested());

    await clickReset();

    expect(useExecutionStore.getState()).toMatchObject({ status: 'idle', executionId: undefined });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Reset stays on the page in the local draft', async () => {
    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    setRunStatus('completed');

    await clickReset();

    expect(address.leaveRunView).not.toHaveBeenCalled();
  });

  it('Reset in the run view forgets the run and goes back to where edits are saved', async () => {
    render({ isRunView: true });
    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    setRunStatus('completed');

    await clickReset();

    expect(useExecutionStore.getState()).toMatchObject({ status: 'idle', executionId: undefined });
    expect(address.leaveRunView).toHaveBeenCalledTimes(1);
  });

  it('a Stop the server answers with execution_not_found leaves the run view, as Reset does', async () => {
    render({ isRunView: true });
    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    setRunStatus('waiting');
    fetchMock.mockImplementation(async () =>
      jsonResponse(404, { code: 'execution_not_found', message: 'Execution not found' }),
    );

    await clickStop();

    expect(useExecutionStore.getState()).toMatchObject({ status: 'idle', executionId: undefined });
    expect(address.leaveRunView).toHaveBeenCalledTimes(1);
  });

  it('the same answer in the local draft stays on the page and offers Run', async () => {
    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    setRunStatus('waiting');
    fetchMock.mockImplementation(async () =>
      jsonResponse(404, { code: 'execution_not_found', message: 'Execution not found' }),
    );

    await clickStop();

    expect(address.leaveRunView).not.toHaveBeenCalled();
    expect(icons()).toEqual(['Play']);
  });

  it('keeps the Reset escape when a snapshot arrives again: an answering server has not ended the run', () => {
    setRunStatus('waiting');
    act(() => applyConnectionLost());
    act(() => applyStopRequested());

    act(() => applySnapshot(snapshotFrame('waiting')));

    expect(icons()).toEqual(['Stop', 'ArrowCounterClockwise']);
  });

  it('names Reset as abandoning the run once a Stop was asked for on a live run', () => {
    setRunStatus('waiting');
    act(() => applyStopRequested());

    expect(labelOf('ArrowCounterClockwise')).toContain('may still be running');
  });

  it('names Reset plainly once the run has ended, even after a Stop was asked for', () => {
    setRunStatus('waiting');
    act(() => applyStopRequested());
    setRunStatus('completed');

    expect(labelOf('ArrowCounterClockwise')).toBe('Reset');
  });

  it('keeps the canvas read-only while it shows a run, ended or not, and gives it back on reset', () => {
    setRunStatus('waiting');
    expect(useStore.getState().isReadOnlyMode).toBe(true);

    setRunStatus('completed');
    expect(useStore.getState().isReadOnlyMode).toBe(true);

    act(() => resetExecution());
    expect(useStore.getState().isReadOnlyMode).toBe(false);
  });

  describe('without a start node', () => {
    it('hides the controls while there is no run', () => {
      expect(isVisible()).toBe(true);
      deleteStartNode();

      expect(isVisible()).toBe(false);
    });

    it('keeps Stop reachable for a live run, and offers no Play', () => {
      setRunStatus('waiting');
      deleteStartNode();

      expect(isVisible()).toBe(true);
      expect(icons()).toEqual(['Stop']);
    });

    it('offers Reset, and no Play, once the run has ended', () => {
      setRunStatus('completed');
      deleteStartNode();

      expect(isVisible()).toBe(true);
      expect(icons()).toEqual(['ArrowCounterClockwise']);
    });
  });

  describe('after Stop', () => {
    beforeEach(() => {
      act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
      act(() => applySnapshot(snapshotFrame('waiting')));
    });

    it('an accepted cancel offers Stop and Reset while cancelling, then Play and Reset once cancelled', async () => {
      await clickStop();
      act(() => latestStream().emit(snapshotFrame('cancelling')));

      expect(useExecutionStore.getState()).toMatchObject({ status: 'cancelling', isStopRequested: true });
      expect(icons()).toEqual(['Stop', 'ArrowCounterClockwise']);

      act(() => latestStream().emit(cancelledEvent));

      expect(useExecutionStore.getState().status).toBe('cancelled');
      expect(openStreams()).toHaveLength(0);
      expect(icons()).toEqual(['Play', 'ArrowCounterClockwise']);
    });

    it.each([
      [200, { id: 'exec-1', status: 'cancelling' }],
      [409, { code: 'execution_not_cancellable', message: 'Execution already finished' }],
    ])('a %i whose fresh stream is refused keeps the run and offers Stop and Reset', async (status, body) => {
      fetchMock.mockImplementation(async () => jsonResponse(status, body));

      await clickStop();
      act(() => latestStream().refuse());

      expect(useExecutionStore.getState()).toMatchObject({ status: 'disconnected', executionId: 'exec-1' });
      expect(icons()).toEqual(['Stop', 'ArrowCounterClockwise']);
    });
  });
});

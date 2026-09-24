import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionStatus } from '@workflow-builder/types/workflow-execution/execution-events';

import styles from './ai-studio-controls.module.css';

import { BACKEND_URL } from '../../config';
import {
  applyConnectionLost,
  applySnapshot,
  applyStopRequested,
  resetExecution,
  setExecutionStarted,
  useExecutionStore,
} from '../../stores/use-execution-store';
import { cancelledEvent, snapshotFrame } from '../../test/execution-history';
import { installFakeEventSource, latestStream, openStreams } from '../../test/fake-event-source';
import { jsonResponse } from '../../test/json-response';
import { AiStudioControls } from './ai-studio-controls';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

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
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<AiStudioControls />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const icons = () => [...container.querySelectorAll<HTMLElement>('[data-icon]')].map((icon) => icon.dataset['icon']);

  const clickIcon = (name: string) =>
    act(async () => {
      container.querySelector<HTMLElement>(`[data-icon="${name}"]`)?.closest('button')?.click();
    });

  const clickStop = () => clickIcon('Stop');
  const clickReset = () => clickIcon('ArrowCounterClockwise');

  const labelOf = (name: string) =>
    container.querySelector(`[data-icon="${name}"]`)?.closest('button')?.getAttribute('aria-label');

  const isVisible = () => container.firstElementChild?.classList.contains(styles['container--visible']!);

  const deleteStartNode = () => {
    startNode.exists = false;
    act(() => root.render(<AiStudioControls />));
  };

  it('names Play and Stop after their action', () => {
    expect(labelOf('Play')).toBe('Execute (backend)');

    setRunStatus('running');
    expect(labelOf('Stop')).toBe('Cancel execution');
  });

  it('offers Stop while the run waits for a decision, the same as while it runs', () => {
    setRunStatus('running');
    expect(icons()).toEqual(['Stop']);

    setRunStatus('waiting');
    expect(icons()).toEqual(['Stop']);
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

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionStatus } from '@workflow-builder/types/workflow-execution/execution-events';

import { BACKEND_URL } from '../../config';
import {
  applyConnectionLost,
  applySnapshot,
  applyStopUnreachable,
  resetExecution,
  setExecutionStarted,
  useExecutionStore,
} from '../../stores/use-execution-store';
import { installFakeEventSource } from '../../test/fake-event-source';
import { jsonResponse } from '../../test/json-response';
import { AiStudioControls } from './ai-studio-controls';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

vi.mock('../../hooks/use-has-start-node', () => ({ useHasStartNode: () => true }));

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setRunStatus(status: ExecutionStatus) {
  act(() => applySnapshot({ executionId: 'exec-1', status, lastSequence: 0, events: [] }));
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

  it('offers Stop while the run waits for a decision, the same as while it runs', () => {
    setRunStatus('running');
    expect(icons()).toEqual(['Stop']);

    setRunStatus('waiting');
    expect(icons()).toEqual(['Stop']);
  });

  it('adds Reset once a cancel is in flight: a cancel the server never resolves would trap the user', () => {
    setRunStatus('cancelling');

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

  it('adds Reset alongside Stop once a Stop attempt could not reach the server: the user is never trapped', () => {
    setRunStatus('waiting');
    act(() => applyConnectionLost());
    act(() => applyStopUnreachable());

    expect(icons()).toEqual(['Stop', 'ArrowCounterClockwise']);
  });

  it('that Reset clears the canvas and asks the server nothing: it abandons the run, it does not cancel it', async () => {
    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    setRunStatus('waiting');
    act(() => applyConnectionLost());
    act(() => applyStopUnreachable());

    await clickReset();

    expect(useExecutionStore.getState()).toMatchObject({ status: 'idle', executionId: undefined });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('drops the Reset escape once a snapshot arrives again: the server answered', () => {
    setRunStatus('waiting');
    act(() => applyConnectionLost());
    act(() => applyStopUnreachable());

    setRunStatus('waiting');

    expect(icons()).toEqual(['Stop']);
  });
});

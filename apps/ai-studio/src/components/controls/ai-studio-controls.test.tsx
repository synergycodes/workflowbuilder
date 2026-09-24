import { useStore } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionStatus } from '@workflow-builder/types/workflow-execution/execution-events';

import { applyConnectionLost, applySnapshot, resetExecution } from '../../stores/use-execution-store';
import { AiStudioControls } from './ai-studio-controls';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

const graph = { hasStartNode: true };
vi.mock('../../hooks/use-has-start-node', () => ({ useHasStartNode: () => graph.hasStartNode }));

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

  beforeEach(() => {
    resetExecution();
    graph.hasStartNode = true;
    useStore.getState().setToggleReadOnlyMode(false);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<AiStudioControls />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const icons = () => [...container.querySelectorAll<HTMLElement>('[data-icon]')].map((icon) => icon.dataset['icon']);
  const play = () => container.querySelector('[data-icon="Play"]')!.closest('button')!;
  const isVisible = () => container.firstElementChild!.className.includes('container--visible');

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
    expect(play().textContent).toBe('Run');

    await act(async () => play().click());

    expect(icons()).toEqual(['Stop']);
    const stop = container.querySelector('[data-icon="Stop"]')!.closest('button')!;
    expect(stop.textContent).toBe('Stop');
    expect(stop.disabled).toBe(true);
    await act(async () => stop.click());
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('offers Run again after a start the backend refused', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ message: 'Unavailable' }, { status: 503 })),
    );
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => play().click());

    expect(logged).toHaveBeenCalled();
    expect(icons()).toEqual(['Play']);
  });

  it('offers Play and Reset once the run has ended', () => {
    setRunStatus('waiting');
    setRunStatus('completed');

    expect(icons()).toEqual(['Play', 'ArrowCounterClockwise']);
  });

  it('offers Reset whenever a shown run is not running, so the locked canvas can always be given back', () => {
    expect(icons()).toEqual(['Play']);

    setRunStatus('waiting');
    act(() => applyConnectionLost());
    expect(icons()).toEqual(['Play', 'ArrowCounterClockwise']);

    setRunStatus('cancelling');
    expect(icons()).toEqual(['Play', 'ArrowCounterClockwise']);
  });

  it('stays visible while it shows a run, even on a graph that lost its start node', () => {
    expect(isVisible()).toBe(true);

    graph.hasStartNode = false;
    setRunStatus('completed');
    expect(isVisible()).toBe(true);

    act(() => resetExecution());
    expect(isVisible()).toBe(false);
  });

  it('keeps the canvas read-only while it shows a run, ended or not, and gives it back on reset', () => {
    setRunStatus('waiting');
    expect(useStore.getState().isReadOnlyMode).toBe(true);

    setRunStatus('completed');
    expect(useStore.getState().isReadOnlyMode).toBe(true);

    act(() => resetExecution());
    expect(useStore.getState().isReadOnlyMode).toBe(false);
  });
});

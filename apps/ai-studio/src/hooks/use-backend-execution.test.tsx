import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import { BACKEND_URL } from '../config';
import { type RunStatus, resetExecution, setExecutionStarted, useExecutionStore } from '../stores/use-execution-store';
import { deferred } from '../test/deferred';
import { cancelledEvent, parkedRunHistory, snapshotFrame } from '../test/execution-history';
import { FakeEventSource, installFakeEventSource, latestStream, openStreams } from '../test/fake-event-source';
import { jsonResponse, unparsableResponse } from '../test/json-response';
import { useBackendExecution } from './use-backend-execution';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let hook: ReturnType<typeof useBackendExecution> | undefined;

function Host() {
  hook = useBackendExecution();
  return null;
}

function api() {
  if (!hook) throw new Error('hook is not mounted');
  return hook;
}

// StrictMode like the app: effects run twice.
function mountHook() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() =>
    root.render(
      <StrictMode>
        <Host />
      </StrictMode>,
    ),
  );
  return () => {
    act(() => root.unmount());
    container.remove();
  };
}

const STREAM_URL = '/api/executions/exec-1/stream';

// The hydrated store a reload leaves behind before anything mounts.
function rememberRun(status: RunStatus) {
  useExecutionStore.setState({ executionId: 'exec-1', streamUrl: STREAM_URL, status });
}

class RejectingEventSource {
  constructor() {
    throw new SyntaxError("Failed to construct 'EventSource': The URL is invalid.");
  }
}

// The parked run, resumed elsewhere and finished before Stop reached the server.
const completedRunHistory: ExecutionEvent[] = [
  ...parkedRunHistory,
  {
    executionId: 'exec-1',
    timestamp: '2026-09-15T12:00:05.000Z',
    sequence: 4,
    type: 'node_completed',
    nodeId: 'human-1',
    payload: { output: {} },
  },
  { executionId: 'exec-1', timestamp: '2026-09-15T12:00:06.000Z', sequence: 5, type: 'execution_completed' },
];

let unmount: (() => void) | undefined;

beforeEach(() => {
  installFakeEventSource();
  resetExecution();
  hook = undefined;
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useBackendExecution: a reload while a run is in flight', () => {
  it('keeps one stream open on the remembered URL after the StrictMode double mount', () => {
    rememberRun('waiting');
    unmount = mountHook();

    expect(openStreams()).toHaveLength(1);
    expect(latestStream().url).toBe(`${BACKEND_URL}${STREAM_URL}`);
  });

  it('shows the remembered status before the stream answers, so Stop is available at once', () => {
    rememberRun('waiting');
    unmount = mountHook();

    expect(api().status).toBe('waiting');
    expect(api().executionId).toBe('exec-1');
  });

  it('lets the snapshot rebuild the waiting marker', () => {
    rememberRun('waiting');
    unmount = mountHook();

    act(() => latestStream().emit(snapshotFrame('waiting')));

    expect(useExecutionStore.getState().nodeStates['human-1']).toEqual({ status: 'waiting' });
    expect(useExecutionStore.getState().status).toBe('waiting');
  });

  it('retries a run whose connection was lost before the reload', () => {
    rememberRun('disconnected');
    unmount = mountHook();

    expect(openStreams()).toHaveLength(1);
  });

  it('opens no stream for a run that already ended', () => {
    rememberRun('completed');
    unmount = mountHook();

    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('opens no stream for an idle canvas', () => {
    unmount = mountHook();

    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('forgets a remembered alive status that carries no run id', () => {
    useExecutionStore.setState({ status: 'waiting' });
    unmount = mountHook();

    expect(useExecutionStore.getState().status).toBe('idle');
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('forgets a remembered run whose stream URL is not on the backend stream path', () => {
    useExecutionStore.setState({ executionId: 'exec-1', streamUrl: '//evil.example/x', status: 'waiting' });
    unmount = mountHook();

    expect(useExecutionStore.getState()).toMatchObject({ status: 'idle', executionId: undefined });
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('forgets a remembered run whose stream the browser refuses to construct, and stays mounted', () => {
    vi.stubGlobal('EventSource', RejectingEventSource);
    rememberRun('waiting');

    expect(() => {
      unmount = mountHook();
    }).not.toThrow();
    expect(useExecutionStore.getState().status).toBe('idle');
    expect(api().status).toBe('idle');
  });

  it('closes the reopened stream when the controls unmount', () => {
    rememberRun('waiting');
    unmount = mountHook();

    unmount();
    unmount = undefined;

    expect(openStreams()).toHaveLength(0);
  });
});

describe('useBackendExecution: what Stop does with the server answer', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  function serverAnswersDelete(status: number, body: unknown) {
    fetchMock = vi.fn(async () => jsonResponse(status, body));
    vi.stubGlobal('fetch', fetchMock);
  }

  function serverHoldsDelete() {
    const answer = deferred<Response>();
    fetchMock = vi.fn(() => answer.promise);
    vi.stubGlobal('fetch', fetchMock);
    return answer;
  }

  it('a run the server no longer has is forgotten: idle canvas, no stream left open', async () => {
    rememberRun('disconnected');
    unmount = mountHook();
    serverAnswersDelete(404, { code: 'execution_not_found', message: 'Execution not found' });

    await act(() => api().cancel());

    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND_URL}/api/executions/exec-1`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(useExecutionStore.getState().status).toBe('idle');
    expect(useExecutionStore.getState().executionId).toBeUndefined();
    expect(openStreams()).toHaveLength(0);
  });

  it('a run that already finished is caught up on, not forgotten: the reopened stream tells how it ended', async () => {
    rememberRun('disconnected');
    unmount = mountHook();
    const streamBefore = latestStream();
    serverAnswersDelete(409, { code: 'execution_not_cancellable', message: 'Execution already finished' });

    await act(() => api().cancel());

    expect(streamBefore.closed).toBe(true);
    expect(openStreams()).toHaveLength(1);
    expect(latestStream()).not.toBe(streamBefore);

    act(() => latestStream().emit(snapshotFrame('completed')));

    expect(useExecutionStore.getState().status).toBe('completed');
  });

  it('a Stop refused because the run completed ends on completed, keeping the run and the Stop request', async () => {
    rememberRun('disconnected');
    unmount = mountHook();
    serverAnswersDelete(409, { code: 'execution_not_cancellable', message: 'Execution already finished' });

    await act(() => api().cancel());
    act(() => latestStream().emit(snapshotFrame('completed', completedRunHistory)));

    expect(useExecutionStore.getState()).toMatchObject({
      status: 'completed',
      executionId: 'exec-1',
      isStopRequested: true,
    });
    expect(openStreams()).toHaveLength(0);
  });

  it('a cancel the server accepted is followed over a fresh stream, never two at once', async () => {
    rememberRun('waiting');
    unmount = mountHook();
    const streamBefore = latestStream();
    serverAnswersDelete(200, { id: 'exec-1', status: 'cancelling' });

    await act(() => api().cancel());

    expect(streamBefore.closed).toBe(true);
    expect(openStreams()).toHaveLength(1);

    act(() => latestStream().emit(snapshotFrame('cancelling')));

    expect(useExecutionStore.getState().status).toBe('cancelling');
  });

  it('Stop marks the request before the server answers', () => {
    rememberRun('waiting');
    unmount = mountHook();
    serverHoldsDelete();

    void api().cancel();

    expect(fetchMock).toHaveBeenCalled();
    expect(useExecutionStore.getState().isStopRequested).toBe(true);
  });

  it('a run that ended over the old stream while Stop was in flight is not reopened', async () => {
    rememberRun('waiting');
    unmount = mountHook();
    const streamBefore = latestStream();
    const deleteAnswer = serverHoldsDelete();

    const cancelPromise = act(() => api().cancel());
    act(() => streamBefore.emit(cancelledEvent));
    deleteAnswer.resolve(jsonResponse(200, { id: 'exec-1', status: 'cancelling' }));
    await cancelPromise;

    expect(useExecutionStore.getState().status).toBe('cancelled');
    expect(latestStream()).toBe(streamBefore);
    expect(openStreams()).toHaveLength(0);
  });

  it('Stop with nothing remembered asks the server nothing', async () => {
    unmount = mountHook();
    serverAnswersDelete(200, {});

    await act(() => api().cancel());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a request that never reaches the server leaves the run remembered and the request marked', async () => {
    rememberRun('disconnected');
    unmount = mountHook();
    const streamBefore = latestStream();
    fetchMock = vi.fn(async () => {
      throw new Error('connection refused');
    });
    vi.stubGlobal('fetch', fetchMock);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(() => api().cancel());

    expect(useExecutionStore.getState().status).toBe('disconnected');
    expect(useExecutionStore.getState().isStopRequested).toBe(true);
    expect(latestStream()).toBe(streamBefore);
    expect(streamBefore.closed).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('a Stop answer arriving after a newer run started does not reopen a stream for the old one', async () => {
    useExecutionStore.setState({ executionId: 'exec-1', streamUrl: STREAM_URL, status: 'idle' });
    unmount = mountHook();
    const deleteAnswer = serverHoldsDelete();

    const cancelPromise = act(() => api().cancel());
    act(() => {
      setExecutionStarted('exec-2', '/api/executions/exec-2/stream');
    });
    deleteAnswer.resolve(jsonResponse(200, { id: 'exec-1', status: 'cancelling' }));
    await cancelPromise;

    expect(useExecutionStore.getState().executionId).toBe('exec-2');
    expect(useExecutionStore.getState().status).toBe('pending');
    expect(openStreams()).toHaveLength(0);
  });

  it.each([
    ['a 404 that names no code', async () => jsonResponse(404, { message: 'Not Found' })],
    ['a 404 whose body will not parse', async () => unparsableResponse(404)],
    ['a 500', async () => jsonResponse(500, { message: 'Internal Server Error' })],
  ])('%s is not the server forgetting the run: it stays, and Reset becomes the way out', async (_, answer) => {
    rememberRun('disconnected');
    unmount = mountHook();
    fetchMock = vi.fn(answer);
    vi.stubGlobal('fetch', fetchMock);

    await act(() => api().cancel());

    expect(useExecutionStore.getState().executionId).toBe('exec-1');
    expect(useExecutionStore.getState().isStopRequested).toBe(true);
  });

  it('a 404 the owner changed during neither forgets nor marks the newer run', async () => {
    rememberRun('waiting');
    unmount = mountHook();
    // The owner has to change while the body is being read, and a real Response offers no hook for that.
    const bodyThatStartsANewRun = {
      ok: false,
      status: 404,
      json: async () => {
        setExecutionStarted('exec-2', '/api/executions/exec-2/stream');
        return { code: 'execution_not_found', message: 'Execution not found' };
      },
    } as Response;
    fetchMock = vi.fn(async () => bodyThatStartsANewRun);
    vi.stubGlobal('fetch', fetchMock);

    await act(() => api().cancel());

    expect(useExecutionStore.getState().executionId).toBe('exec-2');
    expect(useExecutionStore.getState().isStopRequested).toBe(false);
  });

  it('a Stop that fails after Reset leaves the clean canvas unmarked', async () => {
    rememberRun('waiting');
    unmount = mountHook();
    const deleteAnswer = serverHoldsDelete();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const cancelPromise = act(() => api().cancel());
    act(() => api().reset());
    deleteAnswer.reject(new Error('connection refused'));
    await cancelPromise;

    expect(useExecutionStore.getState()).toMatchObject({
      status: 'idle',
      executionId: undefined,
      isStopRequested: false,
    });
  });

  it('a Stop answered after the controls unmounted opens no stream nobody is left to close', async () => {
    rememberRun('waiting');
    unmount = mountHook();
    const deleteAnswer = serverHoldsDelete();

    const cancelPromise = api().cancel();
    unmount();
    unmount = undefined;
    deleteAnswer.resolve(jsonResponse(200, { id: 'exec-1', status: 'cancelling' }));
    await act(async () => {
      await cancelPromise;
    });

    expect(openStreams()).toHaveLength(0);
  });
});

function serverAcceptsExecute() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.endsWith('/api/workflows')
        ? jsonResponse(201, { id: 'wf-1' })
        : jsonResponse(202, { executionId: 'exec-2', streamUrl: '/api/executions/exec-2/stream' }),
    ),
  );
}

describe('useBackendExecution: starting a run from the canvas', () => {
  it('a new run closes the stream a reload reopened before the server answers, and never joins it', async () => {
    rememberRun('waiting');
    unmount = mountHook();
    const reconnected = latestStream();
    serverAcceptsExecute();

    await act(async () => {
      const run = api().executeFromCanvas([], []);
      expect(reconnected.closed).toBe(true);
      await run;
    });

    expect(reconnected.closed).toBe(true);
    expect(openStreams()).toHaveLength(1);
    expect(latestStream().url).toBe(`${BACKEND_URL}/api/executions/exec-2/stream`);
  });

  it("a new run starts without the previous run's Stop request", async () => {
    rememberRun('waiting');
    unmount = mountHook();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(500, { message: 'Internal Server Error' })),
    );
    await act(() => api().cancel());
    expect(useExecutionStore.getState().isStopRequested).toBe(true);
    serverAcceptsExecute();

    await act(async () => {
      await api().executeFromCanvas([], []);
    });

    expect(useExecutionStore.getState()).toMatchObject({ executionId: 'exec-2', isStopRequested: false });
  });

  it('a workflow that will not save opens no stream and leaves the canvas idle', async () => {
    unmount = mountHook();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(500, { message: 'Failed to save workflow' })),
    );

    await act(async () => {
      await expect(api().executeFromCanvas([], [])).rejects.toThrow('Failed to save workflow');
    });

    expect(useExecutionStore.getState().status).toBe('idle');
    expect(FakeEventSource.instances).toHaveLength(0);
  });
});

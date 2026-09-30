import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import { openFromUrl } from '../app/open-from-url';
import { BACKEND_URL } from '../config';
import { knownNodeTypes } from '../data/known-node-types';
import { refundReviewFlow } from '../data/refund-review-flow';
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

// The store as openFromUrl leaves it before the editor mounts.
function putRunInStore(status: RunStatus) {
  useExecutionStore.setState({ executionId: 'exec-1', streamUrl: STREAM_URL, status });
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
  globalThis.history.replaceState(null, '', '/');
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useBackendExecution: the run openFromUrl put in the store', () => {
  it('keeps one stream open on its URL after the StrictMode double mount', () => {
    putRunInStore('waiting');
    unmount = mountHook();

    expect(openStreams()).toHaveLength(1);
    expect(latestStream().url).toBe(`${BACKEND_URL}${STREAM_URL}`);
  });

  it('shows its status before the stream answers, so Stop is available at once', () => {
    putRunInStore('waiting');
    unmount = mountHook();

    expect(api().status).toBe('waiting');
    expect(api().executionId).toBe('exec-1');
  });

  it('lets the snapshot rebuild the waiting marker', () => {
    putRunInStore('waiting');
    unmount = mountHook();

    act(() => latestStream().emit(snapshotFrame('waiting')));

    expect(useExecutionStore.getState().nodeStates['human-1']).toEqual({ status: 'waiting' });
    expect(useExecutionStore.getState().status).toBe('waiting');
  });

  it('opens no stream for a run that already ended', () => {
    putRunInStore('completed');
    unmount = mountHook();

    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('opens no stream for an idle canvas', () => {
    unmount = mountHook();

    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it('closes the reopened stream when the controls unmount', () => {
    putRunInStore('waiting');
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
    putRunInStore('disconnected');
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
    putRunInStore('disconnected');
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
    putRunInStore('disconnected');
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
    putRunInStore('waiting');
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
    putRunInStore('waiting');
    unmount = mountHook();
    serverHoldsDelete();

    void api().cancel();

    expect(fetchMock).toHaveBeenCalled();
    expect(useExecutionStore.getState().isStopRequested).toBe(true);
  });

  it('a run that ended over the old stream while Stop was in flight is not reopened', async () => {
    putRunInStore('waiting');
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
    putRunInStore('disconnected');
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
    putRunInStore('disconnected');
    unmount = mountHook();
    fetchMock = vi.fn(answer);
    vi.stubGlobal('fetch', fetchMock);

    await act(() => api().cancel());

    expect(useExecutionStore.getState().executionId).toBe('exec-1');
    expect(useExecutionStore.getState().isStopRequested).toBe(true);
  });

  it('a 404 the owner changed during neither forgets nor marks the newer run', async () => {
    putRunInStore('waiting');
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
    putRunInStore('waiting');
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
    putRunInStore('waiting');
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
    putRunInStore('waiting');
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
    putRunInStore('waiting');
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

  it('puts the new run in the address', async () => {
    unmount = mountHook();
    serverAcceptsExecute();

    await act(async () => {
      await api().executeFromCanvas([], []);
    });

    expect(globalThis.location.search).toBe('?executionId=exec-2');
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

describe('useBackendExecution: starting a run on the workflow the link opened', () => {
  const workflow = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';
  const nodes = [{ id: 'n-1' }];

  it("saves the canvas into that workflow's draft, runs that workflow and adds the run to its address", async () => {
    globalThis.history.replaceState(null, '', `/?workflowId=${workflow}`);
    unmount = mountHook();
    const request = vi.fn<typeof fetch>(async (url) =>
      String(url).endsWith('/draft')
        ? jsonResponse(200, { id: workflow, name: 'Refund review' })
        : jsonResponse(202, { executionId: 'exec-2', streamUrl: '/api/executions/exec-2/stream' }),
    );
    vi.stubGlobal('fetch', request);

    await act(async () => {
      await api().executeFromCanvas(nodes, [], {}, workflow);
    });

    expect(request.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      [`${BACKEND_URL}/api/workflows/${workflow}/draft`, 'PATCH'],
      [`${BACKEND_URL}/api/workflows/${workflow}/execute`, 'POST'],
    ]);
    expect(JSON.parse(request.mock.calls[0]![1]!.body as string)).toEqual({
      draftJson: { nodes, edges: [] },
    });
    expect(globalThis.location.search).toBe(`?workflowId=${workflow}&executionId=exec-2`);
  });

  it('a workflow the server no longer has starts nothing and leaves the address alone', async () => {
    globalThis.history.replaceState(null, '', `/?workflowId=${workflow}`);
    unmount = mountHook();
    const request = vi.fn(async () => jsonResponse(404, { code: 'workflow_not_found', message: 'Workflow not found' }));
    vi.stubGlobal('fetch', request);

    await act(async () => {
      await expect(api().executeFromCanvas(nodes, [], {}, workflow)).rejects.toThrow('Workflow not found');
    });

    expect(request).toHaveBeenCalledTimes(1);
    expect(useExecutionStore.getState().status).toBe('idle');
    expect(globalThis.location.search).toBe(`?workflowId=${workflow}`);
  });
});

describe('useBackendExecution: Reset', () => {
  it('takes the run out of the address and keeps the workflow', () => {
    const workflow = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';
    globalThis.history.replaceState(null, '', `/?workflowId=${workflow}&executionId=exec-1`);
    putRunInStore('completed');
    unmount = mountHook();

    act(() => api().reset());

    expect(globalThis.location.search).toBe(`?workflowId=${workflow}`);
  });
});

describe('useBackendExecution: a run opened from the link', () => {
  const run = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
  const graph = { nodes: refundReviewFlow.value.diagram.nodes, edges: refundReviewFlow.value.diagram.edges };

  it('opens exactly one stream, on that run, after the StrictMode double mount', async () => {
    putRunInStore('waiting');

    await openFromUrl(`?executionId=${run}`, {
      fetchWorkflow: vi.fn(),
      fetchExecutionSnapshot: async () => ({
        ok: true,
        data: { workflowId: '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11', sourceVersion: 'draft', snapshot: graph },
      }),
      knownTypes: knownNodeTypes,
    });
    unmount = mountHook();

    expect(openStreams()).toHaveLength(1);
    expect(latestStream().url).toBe(`${BACKEND_URL}/api/executions/${run}/stream`);
  });
});

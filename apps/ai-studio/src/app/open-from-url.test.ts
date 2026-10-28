import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowRecord } from '@workflow-builder/types/workflow-execution/api';

import { BACKEND_URL } from '../config';
import { refundReviewFlow } from '../data/refund-review-flow';
import { resetExecution, setLogCollapsed, useExecutionStore } from '../stores/use-execution-store';
import { jsonResponse, unparsableResponse } from '../test/json-response';
import { OpenError } from './open-error';
import { openFromUrl } from './open-from-url';

const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const WORKFLOW = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';
const graph = { nodes: refundReviewFlow.value.diagram.nodes, edges: refundReviewFlow.value.diagram.edges };

const workflow: WorkflowRecord = {
  id: WORKFLOW,
  name: 'Refund desk',
  draftJson: graph,
  publishedJson: null,
  publishedAt: null,
  createdAt: '2026-09-28T10:00:00.000Z',
  updatedAt: '2026-09-28T10:00:00.000Z',
};
const snapshot = { workflowId: WORKFLOW, sourceVersion: 'draft', snapshot: graph };

let fetchMock: ReturnType<typeof vi.fn>;

const requestedPaths = () => fetchMock.mock.calls.map(([url]) => String(url).replace(BACKEND_URL, ''));

beforeEach(() => {
  resetExecution();
  fetchMock = vi.fn(async (url: string) =>
    String(url).endsWith('/snapshot') ? jsonResponse(200, snapshot) : jsonResponse(200, workflow),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openFromUrl: a run', () => {
  it('reads the graph the run executed and puts the run in the store, where the one stream opener finds it', async () => {
    const opened = await openFromUrl(`?executionId=${RUN}`);

    expect(requestedPaths()).toEqual([`/api/executions/${RUN}/snapshot`]);
    expect(opened).toEqual({ kind: 'execution', executionId: RUN, diagram: graph });
    expect(useExecutionStore.getState()).toMatchObject({
      executionId: RUN,
      streamUrl: `/api/executions/${RUN}/stream`,
      status: 'pending',
    });
  });

  it('keeps the log as the tab left it, collapsed included', async () => {
    setLogCollapsed(true);

    await openFromUrl(`?executionId=${RUN}`);

    expect(useExecutionStore.getState().isLogCollapsed).toBe(true);
  });

  it('wins over a workflow in the same address, which is not read', async () => {
    const opened = await openFromUrl(`?workflowId=${WORKFLOW}&executionId=${RUN}`);

    expect(requestedPaths()).toEqual([`/api/executions/${RUN}/snapshot`]);
    expect(opened.kind).toBe('execution');
  });

  it('is read under its lowercase id, the form the backend stores', async () => {
    const opened = await openFromUrl(`?executionId=${RUN.toUpperCase()}`);

    expect(requestedPaths()).toEqual([`/api/executions/${RUN}/snapshot`]);
    expect(opened).toMatchObject({ executionId: RUN });
    expect(useExecutionStore.getState().executionId).toBe(RUN);
  });

  it('an id in any other shape is asked of the server as written', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(500, { code: 'internal_error', message: 'Internal' }));

    await expect(openFromUrl('?executionId=nope')).rejects.toBeInstanceOf(OpenError);

    expect(requestedPaths()).toEqual(['/api/executions/nope/snapshot']);
  });

  it.each([
    [
      'a 404',
      () => jsonResponse(404, { code: 'execution_not_found', message: 'Not found' }),
      'the server answered 404',
    ],
    ['a 502', () => jsonResponse(502, { message: 'Bad gateway' }), 'the server answered 502'],
    [
      'no answer',
      () => {
        throw new TypeError('Failed to fetch');
      },
      'the server did not answer',
    ],
    ["a proxy's page for a 200", () => unparsableResponse(200), "the server's answer could not be read"],
  ])('%s rejects with the reason and leaves the store idle', async (_, answer, reason) => {
    fetchMock.mockImplementation(async () => answer());

    const opening = openFromUrl(`?executionId=${RUN}`);

    await expect(opening).rejects.toBeInstanceOf(OpenError);
    await expect(opening).rejects.toMatchObject({
      what: 'run',
      message: `The run in the link could not be opened: ${reason}.`,
    });
    expect(useExecutionStore.getState()).toMatchObject({ executionId: undefined, status: 'idle' });
  });
});

describe('openFromUrl: a workflow', () => {
  it('opens its draft under its name and leaves the store idle', async () => {
    const opened = await openFromUrl(`?workflowId=${WORKFLOW}`);

    expect(requestedPaths()).toEqual([`/api/workflows/${WORKFLOW}`]);
    expect(opened).toEqual({ kind: 'workflow', workflowId: WORKFLOW, name: 'Refund desk', diagram: graph });
    expect(useExecutionStore.getState().status).toBe('idle');
  });

  it('opens the published version when there is no draft, and an empty canvas when there is neither', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, { ...workflow, draftJson: null, publishedJson: graph }));
    expect(await openFromUrl(`?workflowId=${WORKFLOW}`)).toMatchObject({ diagram: graph });

    fetchMock.mockImplementation(async () => jsonResponse(200, { ...workflow, draftJson: null, publishedJson: null }));
    expect(await openFromUrl(`?workflowId=${WORKFLOW}`)).toMatchObject({ diagram: { nodes: [], edges: [] } });
  });

  it('that will not open rejects naming the workflow, so the error screen offers the local draft', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(404, { code: 'workflow_not_found', message: 'Not found' }));

    await expect(openFromUrl(`?workflowId=${WORKFLOW}`)).rejects.toMatchObject({
      what: 'workflow',
      message: 'The workflow in the link could not be opened: the server answered 404.',
    });
  });
});

describe('openFromUrl: a bare address', () => {
  it.each(['', '?executionId=', '?workflowId=%20', '?other=1'])(
    '%j opens the local draft without asking the server',
    async (search) => {
      expect(await openFromUrl(search)).toEqual({ kind: 'local' });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(useExecutionStore.getState().status).toBe('idle');
    },
  );
});

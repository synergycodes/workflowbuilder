import { afterEach, describe, expect, it, vi } from 'vitest';

import { BACKEND_URL } from '../config';
import { jsonResponse, unparsableResponse } from '../test/json-response';
import { fetchExecutionSnapshot, fetchWorkflow } from './open-from-url-api';

const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const WORKFLOW = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';

const record = { id: WORKFLOW, name: 'Refund desk', draftJson: null, publishedJson: null };
const snapshot = { workflowId: WORKFLOW, sourceVersion: 'draft', snapshot: { nodes: [], edges: [] } };

function stubFetch(answer: Response | Error) {
  const fetchMock = vi.fn(() => (answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer)));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchWorkflow', () => {
  it('reads the workflow row', async () => {
    const fetchMock = stubFetch(jsonResponse(200, record));

    expect(await fetchWorkflow(WORKFLOW)).toEqual({ ok: true, data: record });
    expect(fetchMock).toHaveBeenCalledWith(`${BACKEND_URL}/api/workflows/${WORKFLOW}`);
  });

  it('keeps the status and code of a refusal', async () => {
    stubFetch(jsonResponse(404, { code: 'workflow_not_found', message: 'Workflow not found' }));

    expect(await fetchWorkflow(WORKFLOW)).toEqual({ ok: false, status: 404, code: 'workflow_not_found' });
  });

  it('keeps the status of a proxy error page', async () => {
    stubFetch(unparsableResponse(502));

    expect(await fetchWorkflow(WORKFLOW)).toEqual({ ok: false, status: 502 });
  });

  it('reports a request that never got an answer', async () => {
    stubFetch(new TypeError('Failed to fetch'));

    expect(await fetchWorkflow(WORKFLOW)).toEqual({ ok: false, status: 'network' });
  });

  it.each([
    ['an HTML page', unparsableResponse(200)],
    ['JSON without a name', jsonResponse(200, { id: WORKFLOW })],
  ])('reads a 200 carrying %s as unparsable', async (_name, answer) => {
    stubFetch(answer);

    expect(await fetchWorkflow(WORKFLOW)).toEqual({ ok: false, status: 'unparsable' });
  });
});

describe('fetchExecutionSnapshot', () => {
  it('reads the graph the run executed', async () => {
    const fetchMock = stubFetch(jsonResponse(200, snapshot));

    expect(await fetchExecutionSnapshot(RUN)).toEqual({ ok: true, data: snapshot });
    expect(fetchMock).toHaveBeenCalledWith(`${BACKEND_URL}/api/executions/${RUN}/snapshot`);
  });

  it('reads a 200 without the workflow id as unparsable', async () => {
    stubFetch(jsonResponse(200, { snapshot: {} }));

    expect(await fetchExecutionSnapshot(RUN)).toEqual({ ok: false, status: 'unparsable' });
  });
});

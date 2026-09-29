import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GetExecutionSnapshotResponse, WorkflowRecord } from '@workflow-builder/types/workflow-execution/api';

import { knownNodeTypes } from '../data/known-node-types';
import { refundReviewFlow } from '../data/refund-review-flow';
import { useDiagramSourceStore } from '../stores/use-diagram-source-store';
import { resetExecution, setExecutionStarted, useExecutionStore } from '../stores/use-execution-store';
import type { ResolveDeps } from '../utils/open-from-url/resolve-diagram-source';
import { openFromUrl } from './open-from-url';

const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const REMEMBERED_RUN = '22222222-3333-4444-8555-666666666666';
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
const snapshot: GetExecutionSnapshotResponse = { workflowId: WORKFLOW, sourceVersion: 'draft', snapshot: graph };

function deps(overrides: Partial<ResolveDeps> = {}): ResolveDeps {
  return {
    fetchWorkflow: vi.fn(async () => ({ ok: true as const, data: workflow })),
    fetchExecutionSnapshot: vi.fn(async () => ({ ok: true as const, data: snapshot })),
    knownTypes: knownNodeTypes,
    ...overrides,
  };
}

function rememberRun() {
  setExecutionStarted(REMEMBERED_RUN, `/api/executions/${REMEMBERED_RUN}/stream`);
  useExecutionStore.setState({ status: 'waiting' });
}

beforeEach(() => {
  resetExecution();
  useDiagramSourceStore.setState({ targetWorkflowId: undefined, notices: [] });
});

afterEach(() => {
  globalThis.history.replaceState(null, '', '/');
});

describe('openFromUrl', () => {
  it('puts a run from the link in place of the remembered one, so the one stream opener reconnects to it', async () => {
    rememberRun();

    const opened = await openFromUrl(`?executionId=${RUN}`, deps());

    expect(opened.kind).toBe('execution');
    expect(useExecutionStore.getState()).toMatchObject({
      executionId: RUN,
      streamUrl: `/api/executions/${RUN}/stream`,
      status: 'pending',
    });
  });

  it('forgets the remembered run when the link opens a workflow, whose canvas that run did not execute', async () => {
    rememberRun();

    const opened = await openFromUrl(`?workflowId=${WORKFLOW}`, deps());

    expect(opened.kind).toBe('workflow');
    expect(useExecutionStore.getState()).toMatchObject({ executionId: undefined, status: 'idle' });
  });

  it.each([
    ['a workflow', `?workflowId=${WORKFLOW}`],
    ['a run of that workflow', `?executionId=${RUN}&workflowId=${WORKFLOW}`],
  ])('makes the workflow the Save and Run target for %s', async (_name, search) => {
    await openFromUrl(search, deps());

    expect(useDiagramSourceStore.getState().targetWorkflowId).toBe(WORKFLOW);
  });

  it.each([
    ['a run', `?executionId=${RUN}`, true],
    ['a run of that workflow', `?executionId=${RUN}&workflowId=${WORKFLOW}`, true],
    ['a workflow', `?workflowId=${WORKFLOW}`, false],
    ['nothing', '', false],
  ])('knows whether it shows the run view for %s', async (_name, search, isRunView) => {
    await openFromUrl(search, deps());

    expect(useDiagramSourceStore.getState().isRunView).toBe(isRunView);
  });

  it('sets no target for a run opened on its own', async () => {
    await openFromUrl(`?executionId=${RUN}`, deps());

    expect(useDiagramSourceStore.getState().targetWorkflowId).toBeUndefined();
  });

  it('opens the local draft instead of rejecting when a dependency throws', async () => {
    const failing = deps({
      fetchExecutionSnapshot: () => {
        throw new Error('adapter bug');
      },
    });

    await expect(openFromUrl(`?executionId=${RUN}`, failing)).resolves.toEqual({ kind: 'local' });
  });

  it('forgets the remembered run when something throws, so it is not reopened on the local draft', async () => {
    rememberRun();
    const failing = deps({
      fetchExecutionSnapshot: () => {
        throw new Error('adapter bug');
      },
    });

    await openFromUrl('', failing);

    expect(useExecutionStore.getState()).toMatchObject({ executionId: undefined, status: 'idle' });
  });

  it('hands the notices to the notice list', async () => {
    await openFromUrl('?executionId=nope', deps());

    const notices = useDiagramSourceStore.getState().notices;
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ variant: 'warning' });
    expect(notices[0]!.text).toContain('executionId');
  });
});

describe('openFromUrl: a bare address and the remembered run', () => {
  it('opens the remembered run on the graph it executed, and puts it in the address', async () => {
    rememberRun();
    const fakes = deps();

    const opened = await openFromUrl('', fakes);

    expect(fakes.fetchExecutionSnapshot).toHaveBeenCalledWith(REMEMBERED_RUN);
    expect(opened).toMatchObject({ kind: 'execution', executionId: REMEMBERED_RUN });
    expect(globalThis.location.search).toBe(`?executionId=${REMEMBERED_RUN}`);
  });

  it('forgets a remembered run that cannot be opened, and leaves the address bare', async () => {
    rememberRun();

    const opened = await openFromUrl(
      '',
      deps({ fetchExecutionSnapshot: vi.fn(async () => ({ ok: false as const, status: 404 })) }),
    );

    expect(opened).toEqual({ kind: 'local' });
    expect(useExecutionStore.getState()).toMatchObject({ executionId: undefined, status: 'idle' });
    expect(globalThis.location.search).toBe('');
    expect(useDiagramSourceStore.getState().notices).toHaveLength(1);
  });

  it('forgets a remembered id that is not a UUID instead of opening it', async () => {
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
    const fakes = deps();

    const opened = await openFromUrl('', fakes);

    expect(opened).toEqual({ kind: 'local' });
    expect(fakes.fetchExecutionSnapshot).not.toHaveBeenCalled();
    expect(useExecutionStore.getState().executionId).toBeUndefined();
  });

  it('keeps a remembered run the server did not answer for in the address, so a reload tries it again', async () => {
    rememberRun();

    const opened = await openFromUrl(
      '',
      deps({ fetchExecutionSnapshot: vi.fn(async () => ({ ok: false as const, status: 'network' as const })) }),
    );

    expect(opened).toEqual({ kind: 'local' });
    expect(useExecutionStore.getState().executionId).toBeUndefined();
    expect(globalThis.location.search).toBe(`?executionId=${REMEMBERED_RUN}`);
    expect(useDiagramSourceStore.getState().notices[0]!.text).toMatch(/reload/i);
  });

  it('promotes nothing when no run is remembered', async () => {
    const fakes = deps();

    expect(await openFromUrl('', fakes)).toEqual({ kind: 'local' });
    expect(fakes.fetchExecutionSnapshot).not.toHaveBeenCalled();
    expect(globalThis.location.search).toBe('');
  });

  it('prefers the run the address names over the remembered one', async () => {
    rememberRun();
    const fakes = deps();

    await openFromUrl(`?executionId=${RUN}`, fakes);

    expect(fakes.fetchExecutionSnapshot).toHaveBeenCalledWith(RUN);
    expect(fakes.fetchExecutionSnapshot).not.toHaveBeenCalledWith(REMEMBERED_RUN);
  });

  it('opens the remembered run when the address names only an id that is not valid', async () => {
    rememberRun();
    const fakes = deps();

    const opened = await openFromUrl('?executionId=nope', fakes);

    expect(opened).toMatchObject({ kind: 'execution', executionId: REMEMBERED_RUN });
    expect(useDiagramSourceStore.getState().notices).toHaveLength(1);
  });
});

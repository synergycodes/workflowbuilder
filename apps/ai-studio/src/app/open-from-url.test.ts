import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GetExecutionSnapshotResponse, WorkflowRecord } from '@workflow-builder/types/workflow-execution/api';

import { knownNodeTypes } from '../data/known-node-types';
import { refundReviewFlow } from '../data/refund-review-flow';
import { resetExecution, useExecutionStore } from '../stores/use-execution-store';
import { useNoticesStore } from '../stores/use-notices-store';
import type { ResolveDeps } from '../utils/open-from-url/resolve-diagram-source';
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
const snapshot: GetExecutionSnapshotResponse = { workflowId: WORKFLOW, sourceVersion: 'draft', snapshot: graph };

function deps(overrides: Partial<ResolveDeps> = {}): ResolveDeps {
  return {
    fetchWorkflow: vi.fn(async () => ({ ok: true as const, data: workflow })),
    fetchExecutionSnapshot: vi.fn(async () => ({ ok: true as const, data: snapshot })),
    knownTypes: knownNodeTypes,
    ...overrides,
  };
}

beforeEach(() => {
  resetExecution();
  useNoticesStore.setState({ notices: [] });
});

afterEach(() => {
  globalThis.history.replaceState(null, '', '/');
});

describe('openFromUrl', () => {
  it('puts the run from the link in the store, so the one stream opener connects to it', async () => {
    const opened = await openFromUrl(`?executionId=${RUN}`, deps());

    expect(opened.kind).toBe('execution');
    expect(useExecutionStore.getState()).toMatchObject({
      executionId: RUN,
      streamUrl: `/api/executions/${RUN}/stream`,
      status: 'pending',
    });
  });

  it('opens the local draft instead of rejecting when a dependency throws', async () => {
    const failing = deps({
      fetchExecutionSnapshot: () => {
        throw new Error('adapter bug');
      },
    });

    await expect(openFromUrl(`?executionId=${RUN}`, failing)).resolves.toEqual({ kind: 'local' });
  });

  it('hands the notices to the notice list', async () => {
    await openFromUrl('?executionId=nope', deps());

    const notices = useNoticesStore.getState().notices;
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ variant: 'warning' });
    expect(notices[0]!.text).toContain('executionId');
  });
});

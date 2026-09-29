import { describe, expect, it, vi } from 'vitest';

import type { GetExecutionSnapshotResponse, WorkflowRecord } from '@workflow-builder/types/workflow-execution/api';

import { knownNodeTypes } from '../../data/known-node-types';
import { refundReviewFlow } from '../../data/refund-review-flow';
import type { OpenTarget } from './parse-open-target';
import { type FetchResult, type ResolveDeps, resolveDiagramSource } from './resolve-diagram-source';

const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const WORKFLOW = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';
const OTHER_WORKFLOW = '11111111-2222-4333-8444-555555555555';

const diagram = refundReviewFlow.value.diagram;
const nodeCount = diagram.nodes.length;

const workflow: WorkflowRecord = {
  id: WORKFLOW,
  name: 'Refund desk',
  draftJson: { nodes: diagram.nodes, edges: diagram.edges },
  publishedJson: null,
  publishedAt: null,
  createdAt: '2026-09-28T10:00:00.000Z',
  updatedAt: '2026-09-28T10:00:00.000Z',
};

const snapshot: GetExecutionSnapshotResponse = {
  workflowId: WORKFLOW,
  sourceVersion: 'draft',
  snapshot: { nodes: diagram.nodes, edges: diagram.edges },
};

const ok = <T>(data: T): FetchResult<T> => ({ ok: true, data });

function deps(overrides: Partial<ResolveDeps> = {}) {
  return {
    fetchWorkflow: vi.fn(async () => ok(workflow)),
    fetchExecutionSnapshot: vi.fn(async () => ok(snapshot)),
    knownTypes: knownNodeTypes,
    ...overrides,
  };
}

const target = (fields: Partial<OpenTarget>): OpenTarget => ({ notices: [], ...fields });

const failures: Array<[string, FetchResult<never>]> = [
  ['404', { ok: false, status: 404, code: 'workflow_not_found' }],
  ['403', { ok: false, status: 403, code: 'forbidden' }],
  ['500', { ok: false, status: 500, code: 'internal_error' }],
  ['a network error', { ok: false, status: 'network' }],
  ['an unreadable answer', { ok: false, status: 'unparsable' }],
];

describe('resolveDiagramSource: no ids', () => {
  it('opens the local draft without asking the backend', async () => {
    const fakes = deps();

    expect(await resolveDiagramSource(target({}), fakes)).toEqual({
      source: { kind: 'local' },
      notices: [],
      serverUnreachable: false,
    });
    expect(fakes.fetchWorkflow).not.toHaveBeenCalled();
    expect(fakes.fetchExecutionSnapshot).not.toHaveBeenCalled();
  });

  it('passes the notices parsing produced through', async () => {
    const resolution = await resolveDiagramSource(target({ notices: ['ignored an id'] }), deps());

    expect(resolution.notices).toEqual(['ignored an id']);
  });
});

describe('resolveDiagramSource: ?workflowId=', () => {
  it('opens the draft under the workflow name', async () => {
    const resolution = await resolveDiagramSource(target({ workflowId: WORKFLOW }), deps());

    expect(resolution.notices).toEqual([]);
    expect(resolution.source).toMatchObject({ kind: 'workflow', workflowId: WORKFLOW, name: 'Refund desk' });
    if (resolution.source.kind !== 'workflow') return;
    expect(resolution.source.diagram.nodes).toHaveLength(nodeCount);
  });

  it('falls back to the published version when there is no draft, and says so', async () => {
    const published = { ...workflow, draftJson: null, publishedJson: workflow.draftJson };

    const resolution = await resolveDiagramSource(
      target({ workflowId: WORKFLOW }),
      deps({ fetchWorkflow: vi.fn(async () => ok(published)) }),
    );

    expect(resolution.source.kind).toBe('workflow');
    expect(resolution.notices).toHaveLength(1);
  });

  it('opens the local draft when the workflow has neither a draft nor a published version', async () => {
    const empty = { ...workflow, draftJson: null, publishedJson: null };

    const resolution = await resolveDiagramSource(
      target({ workflowId: WORKFLOW }),
      deps({ fetchWorkflow: vi.fn(async () => ok(empty)) }),
    );

    expect(resolution.source).toEqual({ kind: 'local' });
    expect(resolution.notices).toHaveLength(1);
  });

  it.each(failures)('opens the local draft with one notice on %s', async (_name, failure) => {
    const resolution = await resolveDiagramSource(
      target({ workflowId: WORKFLOW }),
      deps({ fetchWorkflow: vi.fn(async () => failure) }),
    );

    expect(resolution.source).toEqual({ kind: 'local' });
    expect(resolution.notices).toHaveLength(1);
  });

  it('says the same for a workflow that is missing and one that is refused', async () => {
    const [missing, refused] = await Promise.all(
      [failures[0]![1], failures[1]![1]].map((failure) =>
        resolveDiagramSource(target({ workflowId: WORKFLOW }), deps({ fetchWorkflow: vi.fn(async () => failure) })),
      ),
    );

    expect(missing!.notices).toEqual(refused!.notices);
  });

  it('opens the local draft when the draft cannot be drawn', async () => {
    const broken = { ...workflow, draftJson: { nodes: [{ id: 'n-1' }], edges: [] } };

    const resolution = await resolveDiagramSource(
      target({ workflowId: WORKFLOW }),
      deps({ fetchWorkflow: vi.fn(async () => ok(broken)) }),
    );

    expect(resolution.source).toEqual({ kind: 'local' });
    expect(resolution.notices).toHaveLength(1);
  });

  it('opens a draft with node types this app does not know, and names them', async () => {
    const foreignNode = {
      ...diagram.nodes[1]!,
      id: 'n-foreign',
      data: { ...diagram.nodes[1]!.data, type: 'acme/crm' },
    };
    const foreign = { ...workflow, draftJson: { nodes: [...diagram.nodes, foreignNode], edges: diagram.edges } };

    const resolution = await resolveDiagramSource(
      target({ workflowId: WORKFLOW }),
      deps({ fetchWorkflow: vi.fn(async () => ok(foreign)) }),
    );

    expect(resolution.source.kind).toBe('workflow');
    expect(resolution.notices).toHaveLength(1);
    expect(resolution.notices[0]).toContain('acme/crm');
  });
});

describe('resolveDiagramSource: ?executionId=', () => {
  it('opens a run from elsewhere on the graph it executed', async () => {
    const fakes = deps();

    const resolution = await resolveDiagramSource(target({ executionId: RUN }), fakes);

    expect(resolution.notices).toEqual([]);
    expect(resolution.source).toMatchObject({ kind: 'execution', executionId: RUN, workflowId: WORKFLOW });
    expect(resolution.source).not.toHaveProperty('targetWorkflowId');
    expect(fakes.fetchExecutionSnapshot).toHaveBeenCalledWith(RUN);
    expect(fakes.fetchWorkflow).not.toHaveBeenCalled();
  });

  it.each(failures)('opens the local draft with one notice on %s', async (_name, failure) => {
    const resolution = await resolveDiagramSource(
      target({ executionId: RUN }),
      deps({ fetchExecutionSnapshot: vi.fn(async () => failure) }),
    );

    expect(resolution.source).toEqual({ kind: 'local' });
    expect(resolution.notices).toHaveLength(1);
  });

  it.each([
    ['a network error', { ok: false, status: 'network' } as const, true],
    ['a 404', { ok: false, status: 404 } as const, false],
  ])('says whether the server answered, after %s', async (_name, failure, serverUnreachable) => {
    const resolution = await resolveDiagramSource(
      target({ executionId: RUN }),
      deps({ fetchExecutionSnapshot: vi.fn(async () => failure) }),
    );

    expect(resolution.serverUnreachable).toBe(serverUnreachable);
  });

  it('opens the local draft when the executed graph cannot be drawn', async () => {
    const broken = { ...snapshot, snapshot: { nodes: [{ id: 'n-1', type: 'node' }], edges: [] } };

    const resolution = await resolveDiagramSource(
      target({ executionId: RUN }),
      deps({ fetchExecutionSnapshot: vi.fn(async () => ok(broken)) }),
    );

    expect(resolution.source).toEqual({ kind: 'local' });
    expect(resolution.notices).toHaveLength(1);
  });
});

describe('resolveDiagramSource: both ids', () => {
  it('opens the run, and keeps the workflow as the target when the run belongs to it', async () => {
    const fakes = deps();

    const resolution = await resolveDiagramSource(target({ executionId: RUN, workflowId: WORKFLOW }), fakes);

    expect(resolution.notices).toEqual([]);
    expect(resolution.source).toMatchObject({ kind: 'execution', executionId: RUN, targetWorkflowId: WORKFLOW });
    expect(fakes.fetchWorkflow).not.toHaveBeenCalled();
  });

  it('drops a workflow the run does not belong to, and says so', async () => {
    const resolution = await resolveDiagramSource(target({ executionId: RUN, workflowId: OTHER_WORKFLOW }), deps());

    expect(resolution.source.kind).toBe('execution');
    expect(resolution.source).not.toHaveProperty('targetWorkflowId');
    expect(resolution.notices).toHaveLength(1);
  });

  it('opens the workflow when the run cannot be opened', async () => {
    const resolution = await resolveDiagramSource(
      target({ executionId: RUN, workflowId: WORKFLOW }),
      deps({ fetchExecutionSnapshot: vi.fn(async () => failures[0]![1]) }),
    );

    expect(resolution.source).toMatchObject({ kind: 'workflow', workflowId: WORKFLOW });
    expect(resolution.notices).toHaveLength(1);
  });
});

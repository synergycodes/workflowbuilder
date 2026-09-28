import type { GetExecutionSnapshotResponse, WorkflowRecord } from '@workflow-builder/types/workflow-execution/api';

import type { OpenTarget } from './parse-open-target';
import { type Diagram, validateDiagram } from './validate-diagram';

export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number | 'network' | 'unparsable'; code?: string };

type FetchFailure = Extract<FetchResult<unknown>, { ok: false }>;

export type ResolveDeps = {
  fetchWorkflow(workflowId: string): Promise<FetchResult<WorkflowRecord>>;
  fetchExecutionSnapshot(executionId: string): Promise<FetchResult<GetExecutionSnapshotResponse>>;
  isOwnRun(executionId: string): boolean;
  knownTypes: ReadonlySet<string>;
};

export type OpenedSource =
  /** `executionId`: a run this browser started, reopened on the local canvas. */
  | { kind: 'local'; executionId?: string }
  | { kind: 'workflow'; workflowId: string; name: string; diagram: Diagram }
  /** `targetWorkflowId`: the link's workflow, set only when the run belongs to it. */
  | { kind: 'execution'; executionId: string; workflowId: string; targetWorkflowId?: string; diagram: Diagram };

type ExecutionSource = Extract<OpenedSource, { kind: 'execution' }>;
type WorkflowSource = Extract<OpenedSource, { kind: 'workflow' }>;

export type Resolution = { source: OpenedSource; notices: string[] };

const SHOWING_LOCAL = 'Showing your local draft instead.';
const SHOWING_WORKFLOW = 'Showing its workflow instead.';

// 401 and 403 read like 404: telling them apart would confirm that the id exists.
function failureReason(failure: FetchFailure): string {
  if (failure.status === 'network') return 'the server did not answer';
  if (failure.status === 'unparsable') return "the server's answer could not be read";
  if (failure.status === 401 || failure.status === 403 || failure.status === 404) {
    return 'it does not exist or cannot be opened here';
  }
  return `the server answered ${failure.status}`;
}

function checkDiagram(value: unknown, what: string, fallback: string, deps: ResolveDeps, notices: string[]) {
  const check = validateDiagram(value, deps.knownTypes);
  if (!check.ok) {
    notices.push(`${what} cannot be drawn: ${check.reason}. ${fallback}`);
    return;
  }
  if (check.unknownTypes.length > 0) {
    notices.push(
      `Some nodes use types this app does not know (${check.unknownTypes.join(', ')}); they show without a properties panel.`,
    );
  }
  return check.diagram;
}

async function openRun(
  executionId: string,
  deps: ResolveDeps,
  notices: string[],
  fallback: string,
): Promise<ExecutionSource | undefined> {
  const result = await deps.fetchExecutionSnapshot(executionId);
  if (!result.ok) {
    notices.push(`The run in the link could not be opened: ${failureReason(result)}. ${fallback}`);
    return undefined;
  }
  const diagram = checkDiagram(result.data.snapshot, "The run's graph", fallback, deps, notices);
  return diagram && { kind: 'execution', executionId, workflowId: result.data.workflowId, diagram };
}

async function openWorkflow(
  workflowId: string,
  deps: ResolveDeps,
  notices: string[],
): Promise<WorkflowSource | undefined> {
  const result = await deps.fetchWorkflow(workflowId);
  if (!result.ok) {
    notices.push(`The workflow in the link could not be opened: ${failureReason(result)}. ${SHOWING_LOCAL}`);
    return undefined;
  }
  const { name, draftJson, publishedJson } = result.data;
  let value = draftJson;
  if (value === null || value === undefined) {
    if (publishedJson === null || publishedJson === undefined) {
      notices.push(`The workflow in the link has no draft or published version. ${SHOWING_LOCAL}`);
      return undefined;
    }
    notices.push('The workflow has no draft, so its published version is shown.');
    value = publishedJson;
  }
  const diagram = checkDiagram(value, 'The workflow in the link', SHOWING_LOCAL, deps, notices);
  return diagram && { kind: 'workflow', workflowId, name, diagram };
}

async function resolve(target: OpenTarget, deps: ResolveDeps, notices: string[]): Promise<OpenedSource> {
  const { executionId, workflowId } = target;

  if (executionId && workflowId) {
    const run = await openRun(executionId, deps, notices, SHOWING_WORKFLOW);
    if (!run) return (await openWorkflow(workflowId, deps, notices)) ?? { kind: 'local' };
    if (run.workflowId === workflowId) return { ...run, targetWorkflowId: workflowId };
    notices.push(
      "The run does not belong to the link's workflow, so saving and running will not update that workflow.",
    );
    return run;
  }

  if (executionId) {
    if (deps.isOwnRun(executionId)) return { kind: 'local', executionId };
    return (await openRun(executionId, deps, notices, SHOWING_LOCAL)) ?? { kind: 'local' };
  }

  if (workflowId) return (await openWorkflow(workflowId, deps, notices)) ?? { kind: 'local' };

  return { kind: 'local' };
}

/** Never rejects: a source that cannot be opened becomes a notice. */
export async function resolveDiagramSource(target: OpenTarget, deps: ResolveDeps): Promise<Resolution> {
  const notices = [...target.notices];
  const source = await resolve(target, deps, notices);
  return { source, notices };
}

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
  knownTypes: ReadonlySet<string>;
};

export type OpenedSource =
  | { kind: 'local' }
  | { kind: 'workflow'; workflowId: string; name: string; diagram: Diagram }
  /** `targetWorkflowId`: the link's workflow, set only when the run belongs to it. */
  | { kind: 'execution'; executionId: string; workflowId: string; targetWorkflowId?: string; diagram: Diagram };

type ExecutionSource = Extract<OpenedSource, { kind: 'execution' }>;
type WorkflowSource = Extract<OpenedSource, { kind: 'workflow' }>;

/** `serverUnreachable`: a lookup got no answer at all, so the same address may open on a retry. */
export type Resolution = { source: OpenedSource; notices: string[]; serverUnreachable: boolean };

type Trace = { notices: string[]; serverUnreachable: boolean };

const SHOWING_LOCAL = 'Showing your local draft instead.';
const SHOWING_WORKFLOW = 'Showing its workflow instead.';

// 401 and 403 read like 404: telling them apart would confirm that the id exists.
function failureReason(failure: FetchFailure): string {
  if (failure.status === 'network') return 'the server did not answer; reload the page to try again';
  if (failure.status === 'unparsable') return "the server's answer could not be read";
  if (failure.status === 401 || failure.status === 403 || failure.status === 404) {
    return 'it does not exist or cannot be opened here';
  }
  return `the server answered ${failure.status}`;
}

function checkDiagram(value: unknown, what: string, fallback: string, deps: ResolveDeps, { notices }: Trace) {
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
  trace: Trace,
  fallback: string,
): Promise<ExecutionSource | undefined> {
  const result = await deps.fetchExecutionSnapshot(executionId);
  if (!result.ok) {
    if (result.status === 'network') trace.serverUnreachable = true;
    trace.notices.push(`The run could not be opened: ${failureReason(result)}. ${fallback}`);
    return undefined;
  }
  const diagram = checkDiagram(result.data.snapshot, "The run's graph", fallback, deps, trace);
  return diagram && { kind: 'execution', executionId, workflowId: result.data.workflowId, diagram };
}

async function openWorkflow(workflowId: string, deps: ResolveDeps, trace: Trace): Promise<WorkflowSource | undefined> {
  const { notices } = trace;
  const result = await deps.fetchWorkflow(workflowId);
  if (!result.ok) {
    if (result.status === 'network') trace.serverUnreachable = true;
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
  const diagram = checkDiagram(value, 'The workflow in the link', SHOWING_LOCAL, deps, trace);
  return diagram && { kind: 'workflow', workflowId, name, diagram };
}

async function resolve(target: OpenTarget, deps: ResolveDeps, trace: Trace): Promise<OpenedSource> {
  const { executionId, workflowId } = target;

  if (executionId && workflowId) {
    const run = await openRun(executionId, deps, trace, SHOWING_WORKFLOW);
    if (!run) return (await openWorkflow(workflowId, deps, trace)) ?? { kind: 'local' };
    if (run.workflowId === workflowId) return { ...run, targetWorkflowId: workflowId };
    trace.notices.push(
      "The run does not belong to the link's workflow, so saving and running will not update that workflow.",
    );
    return run;
  }

  if (executionId) return (await openRun(executionId, deps, trace, SHOWING_LOCAL)) ?? { kind: 'local' };

  if (workflowId) return (await openWorkflow(workflowId, deps, trace)) ?? { kind: 'local' };

  return { kind: 'local' };
}

/** Never rejects: a source that cannot be opened becomes a notice. */
export async function resolveDiagramSource(target: OpenTarget, deps: ResolveDeps): Promise<Resolution> {
  const trace: Trace = { notices: [...target.notices], serverUnreachable: false };
  const source = await resolve(target, deps, trace);
  return { source, ...trace };
}

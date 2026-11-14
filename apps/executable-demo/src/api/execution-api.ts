import { backendUrl } from '../config';
import type { ProjectedWorkflow } from '../utils/project-executable-workflow';

type FetchLike = typeof fetch;

type StartExecutionResult = {
  executionId: string;
  streamUrl: string;
};

export async function createAndExecuteWorkflow(
  workflow: ProjectedWorkflow,
  triggerPayload: Record<string, unknown>,
  signal: AbortSignal,
  fetcher: FetchLike = fetch,
): Promise<StartExecutionResult> {
  const workflowResponse = await fetcher(backendUrl('/api/workflows'), {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Executable Demo Draft', draftJson: workflow }),
  });
  const workflowBody = await readResponse(workflowResponse);
  if (!workflowResponse.ok) throw responseError(workflowBody, 'Failed to create workflow');
  const workflowId = requiredResponseString(workflowBody, 'id', 'Workflow response');

  const executionResponse = await fetcher(backendUrl(`/api/workflows/${encodeURIComponent(workflowId)}/execute`), {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceVersion: 'draft', triggerPayload }),
  });
  const executionBody = await readResponse(executionResponse);
  if (!executionResponse.ok) throw responseError(executionBody, 'Failed to start execution');

  return {
    executionId: requiredResponseString(executionBody, 'executionId', 'Execution response'),
    streamUrl: requiredResponseString(executionBody, 'streamUrl', 'Execution response'),
  };
}

export async function cancelExecution(executionId: string, signal: AbortSignal, fetcher: FetchLike = fetch) {
  const response = await fetcher(backendUrl(`/api/executions/${encodeURIComponent(executionId)}`), {
    method: 'DELETE',
    signal,
  });
  const body = await readResponse(response);
  if (!response.ok && response.status !== 409) throw responseError(body, 'Failed to cancel execution');
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function responseError(value: unknown, fallback: string): Error {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['message'] === 'string'
  ) {
    return new Error((value as Record<string, string>)['message']);
  }
  return new Error(fallback);
}

function requiredResponseString(value: unknown, key: string, owner: string): string {
  const entry = typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : undefined;
  if (typeof entry !== 'string' || entry.length === 0) throw new Error(`${owner} is missing "${key}".`);
  return entry;
}

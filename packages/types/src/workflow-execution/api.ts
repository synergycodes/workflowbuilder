import type { ExecutionStatus } from './execution-events';

export type SourceVersion = 'draft' | 'published';

export type WorkflowRecord = {
  id: string;
  name: string;
  draftJson: unknown;
  publishedJson: unknown | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowListItem = {
  id: string;
  name: string;
  hasPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkflowRequest = {
  name: string;
  draftJson?: unknown;
};

export type UpdateDraftRequest = {
  draftJson: unknown;
};

export type CreateWorkflowResponse = WorkflowRecord;
export type GetWorkflowResponse = WorkflowRecord;
export type UpdateDraftResponse = WorkflowRecord;
export type PublishWorkflowResponse = WorkflowRecord;
export type ListWorkflowsResponse = WorkflowListItem[];

export type ExecuteWorkflowRequest = {
  sourceVersion: SourceVersion;
  triggerPayload?: unknown;
};

export type ExecuteWorkflowResponse = {
  executionId: string;
  status: 'pending';
  streamUrl: string;
};

export type GetExecutionResponse = {
  id: string;
  workflowId: string;
  sourceVersion: SourceVersion;
  status: ExecutionStatus;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CancelExecutionResponse = {
  id: string;
  status: 'cancelling';
};

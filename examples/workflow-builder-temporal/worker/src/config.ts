import { executionWorkflowId } from '@workflowbuilder/temporal';

export const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? '127.0.0.1:7233';
export const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE ?? 'default';
export const TEMPORAL_UI_ORIGIN = process.env.TEMPORAL_UI_ORIGIN ?? 'http://localhost:8233';
export const BRIDGE_PORT = Number(process.env.BRIDGE_PORT ?? 3210);

// The Workflow Builder workflow (the diagram) this sample runs. Not a Temporal Workflow Id:
// those are derived per run by `executionWorkflowId`.
export const WORKFLOW_ID = 'workflow-builder-temporal-sample';

export function temporalUiUrl(executionId: string): string {
  return `${TEMPORAL_UI_ORIGIN}/namespaces/${TEMPORAL_NAMESPACE}/workflows/${executionWorkflowId(executionId)}`;
}

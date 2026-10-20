import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import type { WorkflowSnapshot } from '../mapper/snapshot-schema';
import { editableFieldsSchema } from './editable-fields-schema';

export type FindDecisionRequestError = 'node_not_found' | 'node_without_decision_request';

export type FindDecisionRequestResult =
  | { request: DecisionRequest; error?: undefined }
  | { request?: undefined; error: FindDecisionRequestError };

// The form's schema comes from the node's `editableFields` picks, not from the request's authored `schema`:
// the decider edits the values those picks reference, and AI Studio builds the form from the same picks.
export function findDecisionRequest(snapshot: WorkflowSnapshot, nodeId: string): FindDecisionRequestResult {
  const node = snapshot.nodes.find((candidate) => candidate.id === nodeId);
  if (node === undefined) return { error: 'node_not_found' };
  const properties = node.data.properties;
  const request = properties?.decisionRequest;
  if (request === undefined) return { error: 'node_without_decision_request' };
  return { request: { ...request, schema: editableFieldsSchema(properties?.['editableFields']) } };
}

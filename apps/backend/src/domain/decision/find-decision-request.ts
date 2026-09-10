import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import type { WorkflowSnapshot } from '../mapper/snapshot-schema';

export type FindDecisionRequestError = 'node_not_found' | 'node_without_decision_request';

export type FindDecisionRequestResult =
  | { request: DecisionRequest; error?: undefined }
  | { request?: undefined; error: FindDecisionRequestError };

export function findDecisionRequest(snapshot: WorkflowSnapshot, nodeId: string): FindDecisionRequestResult {
  const node = snapshot.nodes.find((candidate) => candidate.id === nodeId);
  if (node === undefined) return { error: 'node_not_found' };
  const request = node.data.properties?.decisionRequest;
  if (request === undefined) return { error: 'node_without_decision_request' };
  return { request };
}

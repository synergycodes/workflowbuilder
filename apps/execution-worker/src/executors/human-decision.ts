// The completion arrives through POST /api/executions/:id/decision, never through this executor.
import { type NodeExecutionResult, PermanentNodeExecutionError } from '@workflow-builder/execution-core';

import type { HumanDecisionNode } from '../domain/ai-studio-nodes';

export function executeHumanDecision(node: HumanDecisionNode): NodeExecutionResult {
  if (node.decisionRequest === undefined) {
    throw new PermanentNodeExecutionError(
      'decision_request_missing',
      `Node '${node.id}' carries no decision request, so nobody could ever decide it`,
    );
  }
  return { waiting: true };
}

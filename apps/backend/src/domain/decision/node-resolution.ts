import type { CompletedNodeExecution } from '@workflow-builder/execution-core/workflow';
import type {
  Decision,
  DecisionAction,
  DecisionEffect,
} from '@workflow-builder/types/workflow-execution/decision-request';

// No completion exists for `rerun-source` yet (follow-up: decision-rerun-source).
export type RoutedDecision = Decision & { effect: Exclude<DecisionEffect, 'rerun-source'> };
export type RoutedDecisionAction = Exclude<DecisionAction, { effect: 'rerun-source' }>;

export function hasNodeResolution(decision: Decision): decision is RoutedDecision {
  return decision.effect !== 'rerun-source';
}

export function toNodeResolution(decision: RoutedDecision, action: RoutedDecisionAction): CompletedNodeExecution {
  if (action.port === 'errorRoute') {
    throw new Error(`action '${action.name}' routes to the reserved 'errorRoute' port`);
  }
  return { output: decision, nextPort: action.port };
}

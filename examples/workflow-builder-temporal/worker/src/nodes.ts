import type { BaseNode } from '@workflowbuilder/temporal';

// One variant per palette item in the editor. `config` is what the properties panel
// saved, minus the label and error policy, which the mapper lifts onto the node itself.
type SharedConfig = { description?: string; status?: string };

export type TriggerNode = BaseNode & { type: 'trigger'; config: SharedConfig };
export type ActionNode = BaseNode & {
  type: 'action';
  config: SharedConfig & { message?: string; simulateOutage?: boolean };
};
export type DecisionNode = BaseNode & {
  type: 'decision';
  config: SharedConfig & { decisionBranches?: SampleDecisionBranch[] };
};

export type SampleNode = TriggerNode | ActionNode | DecisionNode;

// Keyed by node type, so a variant added to SampleNode does not compile until it is listed here.
const SAMPLE_NODE_TYPES: Record<SampleNode['type'], true> = { trigger: true, action: true, decision: true };
export const sampleNodeTypes = Object.keys(SAMPLE_NODE_TYPES);

// The SDK does not export its DecisionBranch type, so the worker declares the shape it reads.
export type SampleComparisonOperator =
  | 'isEqual'
  | 'isNotEqual'
  | 'isGreaterThan'
  | 'isLessThan'
  | 'isLessThanOrEqual'
  | 'isGreaterThanOrEqual'
  | 'isContaining'
  | 'isNotContaining'
  | 'isBefore'
  | 'isAfter';

export type SampleCondition = {
  x: string;
  comparisonOperator: SampleComparisonOperator;
  y: string;
  logicalOperator: 'AND' | 'OR';
};

export type SampleDecisionBranch = {
  sourceHandle: string;
  label: string;
  conditions: SampleCondition[];
};

export function isSampleNodeType(type: string): type is SampleNode['type'] {
  return Object.hasOwn(SAMPLE_NODE_TYPES, type);
}

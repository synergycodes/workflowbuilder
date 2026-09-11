import type { BaseNode } from '@workflowbuilder/temporal';

// One variant per palette item in the editor. `config` is what the properties panel
// saved, minus the label, which the mapper lifts onto the node itself.
type SharedConfig = { description?: string; status?: string };

export type TriggerNode = BaseNode & { type: 'trigger'; config: SharedConfig };
export type ActionNode = BaseNode & { type: 'action'; config: SharedConfig & { message?: string } };
export type ConditionNode = BaseNode & { type: 'condition'; config: SharedConfig & { condition?: string } };

export type SampleNode = TriggerNode | ActionNode | ConditionNode;

export const SAMPLE_NODE_TYPES = ['trigger', 'action', 'condition'] as const satisfies readonly SampleNode['type'][];

export function isSampleNodeType(type: string): type is SampleNode['type'] {
  return (SAMPLE_NODE_TYPES as readonly string[]).includes(type);
}

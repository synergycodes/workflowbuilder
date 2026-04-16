import { getStoreNode } from '@/store/slices/diagram-slice/actions';
import useStore from '@/store/store';

import { createDecisionBranch } from '@/features/json-form/controls/decision-branches-control/create-decision-branch';
import { DecisionBranch } from '@/features/json-form/types/controls';

export function addBranchToNode(nodeId: string) {
  const node = getStoreNode(nodeId);
  if (!node) return;

  const properties = node.data.properties;
  const existingBranches = (properties.decisionBranches as DecisionBranch[]) ?? [];

  useStore.getState().setNodeProperties(nodeId, {
    ...properties,
    decisionBranches: [...existingBranches, createDecisionBranch(nodeId)],
  });
}

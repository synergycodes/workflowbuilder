import { generateId } from '@/utils/generate-id';

import { getHandleId } from '@/features/diagram/handles/get-handle-id';

import { DecisionBranch } from '../../types/controls';

export function createDecisionBranch(nodeId: string): DecisionBranch {
  const innerId = generateId();

  return {
    id: generateId(),
    sourceHandle: getHandleId({ nodeId, innerId, handleType: 'source' }),
    label: '',
    conditions: [],
  };
}

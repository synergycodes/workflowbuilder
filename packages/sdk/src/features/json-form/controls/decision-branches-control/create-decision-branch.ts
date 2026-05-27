import { generateId } from '../../../../utils/generate-id';
import { getHandleId } from '../../../diagram/handles/get-handle-id';
import type { DecisionBranch } from '../../types/controls';

export function createDecisionBranch(): DecisionBranch {
  const innerId = generateId();

  return {
    id: generateId(),
    sourceHandle: getHandleId({ innerId, handleType: 'source' }),
    label: '',
    conditions: [],
  };
}

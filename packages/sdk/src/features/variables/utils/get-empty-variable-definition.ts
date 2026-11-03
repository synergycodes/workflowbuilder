import { generateId } from '../../../utils/generate-id';
import type { VariableDefinition } from '../types';

export function getEmptyVariableDefinition(): VariableDefinition {
  return {
    id: generateId(),
    name: '',
    description: '',
    type: 'string',
    defaultValue: '',
  };
}

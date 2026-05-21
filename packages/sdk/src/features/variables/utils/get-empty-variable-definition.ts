import type { VariableDefinition } from '../types';

export function getEmptyVariableDefinition(): VariableDefinition {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    type: 'string',
    defaultValue: '',
  };
}

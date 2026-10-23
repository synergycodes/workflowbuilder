import type { VariableType, VariableTypePrimitive } from '@workflow-builder/types/variables';

export function getVariableTypeIfPrimitive(type: VariableType): VariableTypePrimitive | undefined {
  if (type === 'object' || type === 'array') {
    return;
  }

  return type;
}

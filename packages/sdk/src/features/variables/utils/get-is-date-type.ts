import type { VariableType, VariableTypePrimitive } from '@workflow-builder/types/node-output-schema';

import { typesForDate } from '../components/dynamic-typed-input/constants';

export function getIsDateType(type: VariableType | string | undefined) {
  return typesForDate.includes((type || '') as VariableTypePrimitive);
}

import type { VariableType, VariableTypePrimitive } from '../../../core-contract';
import { typesForDate } from '../components/dynamic-typed-input/constants';

export function getIsDateType(type: VariableType | string | undefined) {
  return typesForDate.includes((type || '') as VariableTypePrimitive);
}

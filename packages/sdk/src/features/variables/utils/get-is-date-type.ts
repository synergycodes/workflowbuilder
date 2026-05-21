import type { VariableTypePrimitive } from '../../../node/node-output-schema';
import { typesForDate } from '../components/dynamic-typed-input/constants';

export function getIsDateType(type: VariableTypePrimitive | string | undefined) {
  return typesForDate.includes((type || '') as VariableTypePrimitive);
}

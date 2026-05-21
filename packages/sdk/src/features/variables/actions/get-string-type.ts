import type { VariableTypePrimitive } from '../../../node/node-output-schema';
import { getIsStringNumber } from '../../../utils/validation/get-is-string-number';
import { getSingleVariableTypeIfPossible } from './get-single-variable-type-if-possible';

export function getStringType(value: string | undefined): VariableTypePrimitive {
  if (getIsStringNumber(value)) {
    return 'number';
  }

  const singleType = getSingleVariableTypeIfPossible(value);
  if (singleType) {
    return singleType;
  }

  return 'string';
}

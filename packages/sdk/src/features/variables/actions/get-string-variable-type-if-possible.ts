import { type VariableTypePrimitive, getVariableTypeIfPrimitive } from '../../../node/node-output-schema';
import { getIsStringNumber } from '../../../utils/validation/get-is-string-number';
import { getSingleVariableTypeIfPossible } from './get-single-variable-type-if-possible';

/**
 * Drives type-relevant operator suggestions in the condition builder: 12 → 'greater than', text → 'contains'.
 */
export function getStringVariableTypeIfPossible(value: string | undefined): VariableTypePrimitive {
  if (getIsStringNumber(value)) {
    return 'number';
  }

  const singleType = getSingleVariableTypeIfPossible(value);
  if (singleType) {
    // Currently strings can't be matched to complex types (objects, arrays)
    const singleTypePrimitive = getVariableTypeIfPrimitive(singleType);
    if (singleTypePrimitive) {
      return singleTypePrimitive;
    }
  }

  return 'string';
}

import { type VariableTypePrimitive, getVariableTypeIfPrimitive } from '../../../node/node-output-schema';
import { getIsStringNumber } from '../../../utils/validation/get-is-string-number';
import { getSingleVariableTypeIfPossible } from './get-single-variable-type-if-possible';

/**
 * Guesses the best matching type for a raw string value.
 *
 * The value can be a literal ('21' → 'number'), or a single variable reference,
 * in which case the type comes from its definition. Anything else falls back to 'string'.
 *
 * Used e.g. in the condition builder to suggest type-relevant operators:
 * typing 12 matches 'number' and suggests 'greater than', while a text value
 * matches 'string' and suggests 'contains'.
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

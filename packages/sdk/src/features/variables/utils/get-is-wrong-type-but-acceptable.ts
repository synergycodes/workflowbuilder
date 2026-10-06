import type { VariableTypePrimitive } from '../../../node/node-output-schema';
import { getIsValidDate } from '../../../utils/validation/get-is-valid-date';
import { getStringVariableTypeIfPossible } from '../actions/get-string-variable-type-if-possible';
import { acceptedBooleanValues, typesForDate } from '../components/dynamic-typed-input/constants';

type Params = {
  expectedType?: VariableTypePrimitive;
  value: string | undefined;
};

/**
 * Soft type mismatches the form tolerates instead of raising an error.
 * False both when the types match and when the mismatch is not tolerated; true only for a tolerated mismatch.
 */
export function getIsWrongTypeButAcceptable({ expectedType = 'string', value }: Params) {
  const valueType = getStringVariableTypeIfPossible(value);

  if (expectedType !== valueType) {
    // We can use string variable and compare it to the string '12'
    const isStringEqualsToNumber = expectedType === 'string' && valueType === 'number';
    const isBooleanWithStringValue = expectedType === 'boolean' && acceptedBooleanValues.includes(value);
    const isDateDifferentDateType = typesForDate.includes(expectedType) && typesForDate.includes(valueType);
    const isDateWithStringDate = expectedType && typesForDate.includes(expectedType) && getIsValidDate(value);
    const isWrongTypeButAcceptable =
      isStringEqualsToNumber || isBooleanWithStringValue || isDateDifferentDateType || isDateWithStringDate;

    if (!isWrongTypeButAcceptable) {
      return false;
    }

    return true;
  }

  return false;
}

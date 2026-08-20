import type { VariableTypePrimitive } from '../../../node/node-output-schema';
import { getIsValidDate } from '../../../utils/validation/get-is-valid-date';
import { getStringVariableTypeIfPossible } from '../actions/get-string-variable-type-if-possible';
import { acceptedBooleanValues, typesForDate } from '../components/dynamic-typed-input/constants';

type Params = {
  expectedType?: VariableTypePrimitive;
  value: string | undefined;
};

/**
 * Tells whether a value's inferred type doesn't match the expected type,
 * but is still usable (a "soft" mismatch we can tolerate instead of erroring).
 *
 * Returns false when types match, and false when the mismatch is unacceptable.
 * Returns true only for these tolerated mismatches:
 * - number value where a string is expected (e.g. '12' compared as string)
 * - boolean expected with 'true' / 'false' / '' string value
 * - date ↔ datetime mix
 * - date/datetime expected with a string that parses as a valid date
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

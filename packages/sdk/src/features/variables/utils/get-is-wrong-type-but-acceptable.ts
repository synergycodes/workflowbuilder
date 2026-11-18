import type { VariableTypePrimitive } from '@workflow-builder/types/variables/variables';

import { getTimeHHmm } from '../../../utils/time-iso';
import { getIsValidDate } from '../../../utils/validation/get-is-valid-date';
import { getStringVariableTypeIfPossible } from '../actions/get-string-variable-type-if-possible';
import { acceptedBooleanValues, typesForDate, typesForTime } from '../components/dynamic-typed-input/constants';

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
    const isDateWithStringDate = typesForDate.includes(expectedType) && getIsValidDate(value);
    const isTimeWithDatetime = expectedType === 'time' && typesForTime.includes(valueType);
    const isTimeWithStringTime = expectedType === 'time' && getTimeHHmm(value) !== undefined;
    const isWrongTypeButAcceptable =
      isStringEqualsToNumber ||
      isBooleanWithStringValue ||
      isDateDifferentDateType ||
      isDateWithStringDate ||
      isTimeWithDatetime ||
      isTimeWithStringTime;

    if (!isWrongTypeButAcceptable) {
      return false;
    }

    return true;
  }

  return false;
}

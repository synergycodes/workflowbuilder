import type { VariableTypePrimitive } from '../../../node/node-output-schema';
import { getIsValidDate } from '../../../utils/validation/get-is-valid-date';
import { acceptedBooleanValues, typesForDate } from '../components/dynamic-typed-input/constants';
import { getStringType } from './get-string-type';

type Params = {
  expectedType?: VariableTypePrimitive;
  value: string | undefined;
};

export function getIsWrongTypeButAcceptable({ expectedType = 'string', value }: Params) {
  const valueType = getStringType(value);

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

import { VARIABLE_BRACKETS_END, VARIABLE_BRACKETS_START } from '../constants';

export function getIsSingleVariable(value: string | undefined): boolean {
  const valueTrimmed = value?.trim();
  if (!valueTrimmed) {
    return false;
  }

  const hasExpectedBrackets =
    valueTrimmed.startsWith(VARIABLE_BRACKETS_START) && valueTrimmed.endsWith(VARIABLE_BRACKETS_END);
  if (!hasExpectedBrackets) {
    return false;
  }

  const isOnlyOneVariable =
    `${VARIABLE_BRACKETS_START}${valueTrimmed.replaceAll(VARIABLE_BRACKETS_START, '').replaceAll(VARIABLE_BRACKETS_END, '')}${VARIABLE_BRACKETS_END}` ===
    valueTrimmed;

  if (isOnlyOneVariable) {
    return true;
  }

  return false;
}

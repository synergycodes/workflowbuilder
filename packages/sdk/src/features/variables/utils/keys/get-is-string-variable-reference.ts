import { VARIABLE_BRACKETS_END, VARIABLE_BRACKETS_START } from '../../constants';
import type { MaybeVariableReference } from '../../types';

export function getIsStringVariableReference(value: MaybeVariableReference): boolean {
  const valueTrimmed = typeof value === 'string' ? value?.trim() : '';
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

export function getIsStringVariableReferenceStart(value: MaybeVariableReference): boolean {
  const valueTrimmed = typeof value === 'string' ? value?.trim() : '';
  if (!valueTrimmed) {
    return false;
  }

  if (valueTrimmed.startsWith(VARIABLE_BRACKETS_START.slice(0, 1)) && valueTrimmed.length === 1) {
    return true;
  }

  if (valueTrimmed.startsWith(VARIABLE_BRACKETS_START.slice(0, 2))) {
    return true;
  }

  return false;
}

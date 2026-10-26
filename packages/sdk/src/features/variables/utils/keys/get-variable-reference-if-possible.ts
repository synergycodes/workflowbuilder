import type { VariableReference } from '../../../../core-contract';
import type { MaybeVariableReference } from '../../types';
import { getIsStringVariableReference } from './get-is-string-variable-reference';

export function getVariableReferenceIfPossible(value: MaybeVariableReference): VariableReference | undefined {
  const isValid = getIsStringVariableReference(value?.trim());

  if (value && isValid) {
    return value.trim() as VariableReference;
  }
}

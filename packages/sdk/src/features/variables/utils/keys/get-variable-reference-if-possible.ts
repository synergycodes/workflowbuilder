import type { MaybeVariableReference, VariableReference } from '../../types';
import { getIsStringVariableReference } from './get-is-string-variable-reference';

export function getVariableReferenceIfPossible(value: MaybeVariableReference): VariableReference | undefined {
  const isValid = getIsStringVariableReference(value?.trim());

  if (value && isValid) {
    return value.trim() as VariableReference;
  }
}

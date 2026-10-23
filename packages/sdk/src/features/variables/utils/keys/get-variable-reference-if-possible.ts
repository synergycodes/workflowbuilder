import type { VariableReference } from '@workflow-builder/types/variables';

import type { MaybeVariableReference } from '../../types';
import { getIsStringVariableReference } from './get-is-string-variable-reference';

export function getVariableReferenceIfPossible(value: MaybeVariableReference): VariableReference | undefined {
  const isValid = getIsStringVariableReference(value?.trim());

  if (value && isValid) {
    return value.trim() as VariableReference;
  }
}

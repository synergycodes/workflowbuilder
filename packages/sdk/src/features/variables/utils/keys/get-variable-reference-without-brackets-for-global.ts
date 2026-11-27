import { VARIABLE_GLOBAL_KEY } from '../../constants';
import type { MaybeVariableReference } from '../../types';

export function getVariableReferenceWithoutBracketsForGlobal(variableId: string): NonNullable<MaybeVariableReference> {
  return `${VARIABLE_GLOBAL_KEY}.${variableId}`;
}

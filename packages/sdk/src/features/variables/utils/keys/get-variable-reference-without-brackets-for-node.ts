import { VARIABLE_NODES_KEY } from '../../constants';
import type { MaybeVariableReference } from '../../types';

type Params = {
  nodeId: string;
  propertyName: string;
};

export function getVariableReferenceWithoutBracketsForNode({
  nodeId,
  propertyName,
}: Params): NonNullable<MaybeVariableReference> {
  return `${VARIABLE_NODES_KEY}.${nodeId}.${propertyName}`;
}

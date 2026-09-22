import type { WBIcon } from '@workflow-builder/icons';

import { getStoreNodes } from '../../../store/slices/diagram-slice/actions';
import type { MaybeVariableReference } from '../types';
import { getVariableReferences } from '../utils/keys/get-variable-references';

export type NodeWithVariable = {
  id: string;
  icon: WBIcon;
  title?: string;
};

/**
 * Returns nodes whose properties reference the given variable.
 *
 * This is a very expensive operation (stringifies properties of every node), so call it only inside
 * a callback triggered by a user action - when the variable edit or delete flow is opened.
 *
 * The result is used to:
 * - block changing the type of a variable that is already used, since existing controls would keep a value
 *   that no longer matches the type (e.g. a number variable switched to string leaves a broken control value)
 * - block deleting a variable that is still used, and show which nodes contain it
 */
export function getNodesWithVariable(maybeReference: MaybeVariableReference): NodeWithVariable[] {
  const { reference } = getVariableReferences(maybeReference);

  if (!reference) {
    console.error(`Unsupported variable for getNodesIdsWithVariable: ${maybeReference}`);

    return [];
  }

  const nodes = getStoreNodes();

  const nodesWithVariables = nodes
    .filter((node) => {
      return JSON.stringify(node.data.properties).includes(reference);
    })
    .map((node) => ({
      id: node.id,
      icon: node.data.icon,
      title: node.data.properties.label,
    }));

  return nodesWithVariables;
}

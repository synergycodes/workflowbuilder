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
 * Stringifies every node's properties, so call it only from a user action (variable edit / delete flow).
 * Blocks type changes and deletes of a variable still in use: a control would keep a value of the old type.
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

import { getPaletteData } from '../../data/palette';
import type { PaletteItem } from '../../node/common';
import type { WorkflowBuilderNode } from '../../node/node-data';
import { getNodesDefinitionsByType } from './get-nodes-definitions-by-type';

export function getNodeDefinition(node?: WorkflowBuilderNode): PaletteItem | undefined {
  const nodesDefinitionsByType = getNodesDefinitionsByType(getPaletteData());

  const dataType = node?.data?.type || '';

  return nodesDefinitionsByType[dataType];
}

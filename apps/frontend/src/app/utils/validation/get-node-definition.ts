import { paletteData } from '@/data/palette';
import { getNodesDefinitionsByType } from './get-nodes-definitions-by-type';
import { WorkflowBuilderNode } from '@workflow-builder/types/node-data';
import { PaletteItem } from '@workflow-builder/types/common';

const nodesDefinitionsByType = getNodesDefinitionsByType(paletteData);

export function getNodeDefinition(node?: WorkflowBuilderNode): PaletteItem | undefined {
  const dataType = node?.data?.type || '';

  return nodesDefinitionsByType[dataType];
}

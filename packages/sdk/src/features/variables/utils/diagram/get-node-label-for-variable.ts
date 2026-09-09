import type { PaletteItem } from '../../../../node/common';
import type { WorkflowBuilderNode } from '../../../../node/node-data';

type Params = {
  definition: PaletteItem;
  node: WorkflowBuilderNode;
};

export function getNodeLabelForVariable({ node, definition }: Params): string {
  return (node.data.properties as { label?: string }).label || definition.label || node.data.type;
}

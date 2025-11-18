import { PaletteItem } from '@workflow-builder/types/common';

type NodesDefinitionsBySubType = {
  [subType: string]: PaletteItem;
};

export function getNodesDefinitionsByType(palette: PaletteItem[]) {
  return palette.reduce((stack: NodesDefinitionsBySubType, item) => {
    stack[item.type] = item;

    return stack;
  }, {});
}

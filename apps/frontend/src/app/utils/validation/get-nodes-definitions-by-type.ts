import { PaletteGroup, PaletteItem, PaletteItemOrGroup } from '@workflow-builder/types/common';

type NodesDefinitionsBySubType = {
  [subType: string]: PaletteItem;
};

function getIsPaletteGroup(value: PaletteItemOrGroup): value is PaletteGroup {
  return Array.isArray((value as PaletteGroup).groupItems);
}

export function getNodesDefinitionsByType(palette: PaletteItemOrGroup[]) {
  return palette.reduce((stack: NodesDefinitionsBySubType, itemOrGroup) => {
    const isGroup = getIsPaletteGroup(itemOrGroup);

    if (isGroup) {
      for (const item of itemOrGroup.groupItems) {
        stack[item.type] = item;
      }
    } else {
      stack[itemOrGroup.type] = itemOrGroup;
    }

    return stack;
  }, {});
}

import { withOptionalFunctionPlugins } from '../features/plugins-core/adapters/adapter-functions';

import type { PaletteItemOrGroup } from '../node/common';

let customPaletteNodes: PaletteItemOrGroup[] = [];

export function setCustomPaletteNodes(nodes: PaletteItemOrGroup[] | null) {
  customPaletteNodes = nodes ?? [];
}

const getPaletteDataFunction = (): PaletteItemOrGroup[] => customPaletteNodes;

export const getPaletteData = withOptionalFunctionPlugins(getPaletteDataFunction, 'getPaletteData');

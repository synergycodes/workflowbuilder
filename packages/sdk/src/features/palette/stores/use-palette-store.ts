import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { PaletteItem } from '../../../node/common';

type PaletteStore = {
  draggedItem: PaletteItem | null;
};

export const usePaletteStore = create<PaletteStore>()(
  devtools(
    () =>
      ({
        draggedItem: null,
      }) satisfies PaletteStore,
    { name: 'paletteStore' },
  ),
);

export function setDraggedItem(item: PaletteItem | null) {
  return usePaletteStore.setState({ draggedItem: item });
}

export function getDraggedItemAction() {
  return usePaletteStore.getState().draggedItem;
}

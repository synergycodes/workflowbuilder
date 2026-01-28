import {
  DraggingItem,
  PaletteGroup,
  PaletteItem,
  PaletteItemOrGroup,
  StatusType,
} from '@workflow-builder/types/common';

import { GetDiagramState, SetDiagramState } from '@/store/store';

import { getPaletteData } from '@/data/palette';

export type PaletteState = {
  isSidebarExpanded: boolean;
  data: PaletteItemOrGroup[];
  fetchDataStatus: StatusType;
  draggedItem: DraggingItem | null;
  toggleSidebar: (value?: boolean) => void;
  fetchData: () => void;
  setDraggedItem: (item: DraggingItem | null) => void;
  getNodeDefinition: (nodeType: string) => PaletteItem | undefined;
};

export function usePaletteSlice(set: SetDiagramState, get: GetDiagramState): PaletteState {
  return {
    isSidebarExpanded: false,
    data: [],
    fetchDataStatus: StatusType.Idle,
    draggedItem: null,
    setDraggedItem: (item) => {
      set({ draggedItem: item });
    },
    toggleSidebar: (value) => {
      set({
        isSidebarExpanded: value ?? !get().isSidebarExpanded,
      });
    },
    fetchData: () => {
      set({ fetchDataStatus: StatusType.Loading });

      set({
        data: getPaletteData(),
        fetchDataStatus: StatusType.Success,
      });
    },
    getNodeDefinition: (nodeType) => {
      const { data } = get();

      const nodeDefinition = data.find((itemOrGroup) => (itemOrGroup as PaletteItem)?.type === nodeType);

      if (nodeDefinition) {
        return nodeDefinition as PaletteItem;
      }

      const groupWithNodeDefinition = data.find((itemOrGroup) =>
        ((itemOrGroup as unknown as PaletteGroup)?.groupItems || []).some(({ type }) => type === nodeType),
      );

      if (groupWithNodeDefinition) {
        return (groupWithNodeDefinition as unknown as PaletteGroup)?.groupItems.find(({ type }) => type === nodeType);
      }

      return;
    },
  };
}

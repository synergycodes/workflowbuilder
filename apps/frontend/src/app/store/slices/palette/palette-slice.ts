import { DraggingItem, PaletteItem, StatusType } from '@workflow-builder/types/common';
import { GetDiagramState, SetDiagramState } from '@/store/store';
import { paletteData } from '@/data/palette';

export type PaletteState = {
  isSidebarExpanded: boolean;
  data: PaletteItem[];
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
        data: paletteData,
        fetchDataStatus: StatusType.Success,
      });
    },
    getNodeDefinition: (nodeType) => {
      const { data } = get();

      return data.find(({ type }) => type === nodeType);
    },
  };
}

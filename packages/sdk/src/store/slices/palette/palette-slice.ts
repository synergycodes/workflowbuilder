import { getPaletteData } from '../../../data/palette';
import { type DraggingItem, type PaletteItem, type PaletteItemOrGroup, StatusType } from '../../../node/common';
import { getNodesDefinitionsByType } from '../../../utils/validation/get-nodes-definitions-by-type';
import type { GetDiagramState, SetDiagramState } from '../../store';
import { refreshNodesErrorsIfNeeded } from '../diagram-slice/actions';

let definitionsSource: PaletteItemOrGroup[] | undefined;
let definitionsByType = new Map<string, PaletteItem>();

function getDefinitionsByType(palette: PaletteItemOrGroup[]) {
  if (palette !== definitionsSource) {
    definitionsSource = palette;
    definitionsByType = new Map(Object.entries(getNodesDefinitionsByType(palette)));
  }

  return definitionsByType;
}

export type PaletteState = {
  isPaletteOpen: boolean;
  isPropertiesPanelOpen: boolean;
  paletteFilter: string;
  data: PaletteItemOrGroup[];
  fetchDataStatus: StatusType;
  draggedItem: DraggingItem | null;
  setPaletteOpen: (value: boolean) => void;
  setPropertiesPanelOpen: (open: boolean) => void;
  setPaletteFilter: (query: string) => void;
  fetchData: () => void;
  setDraggedItem: (item: DraggingItem | null) => void;
  getNodeDefinition: (nodeType: string) => PaletteItem | undefined;
};

export function usePaletteSlice(set: SetDiagramState, get: GetDiagramState): PaletteState {
  return {
    isPaletteOpen: false,
    isPropertiesPanelOpen: true,
    paletteFilter: '',
    data: [],
    fetchDataStatus: StatusType.Idle,
    draggedItem: null,
    setDraggedItem: (item) => {
      set({ draggedItem: item });
    },
    setPaletteOpen: (value) => {
      set({
        isPaletteOpen: value,
      });
    },
    setPropertiesPanelOpen: (open) => {
      set({ isPropertiesPanelOpen: open });
    },
    setPaletteFilter: (query) => {
      set({ paletteFilter: query });
    },
    fetchData: () => {
      set({ fetchDataStatus: StatusType.Loading });

      set({
        data: getPaletteData(),
        fetchDataStatus: StatusType.Success,
      });

      // Defer to the next macrotask: a concurrent node load (its own store
      // update) may still be pending, and nodes that arrived before the palette
      // were validated against an empty definition set, so their errors were
      // dropped. Re-validating after the queue drains repairs them (WB-340).
      // A macrotask (not `queueMicrotask`) is deliberate — we must yield past
      // those pending state updates, not just the current microtask queue.
      setTimeout(() => refreshNodesErrorsIfNeeded(), 0);
    },
    getNodeDefinition: (nodeType) => getDefinitionsByType(get().data).get(nodeType),
  };
}

import { getPaletteData } from '../../../data/palette';
import { type PaletteGroup, type PaletteItem, type PaletteItemOrGroup, StatusType } from '../../../node/common';
import type { GetDiagramState, SetDiagramState } from '../../store';
import { refreshNodesErrorsIfNeeded } from '../diagram-slice/actions';

export type PaletteState = {
  isSidebarExpanded: boolean;
  data: PaletteItemOrGroup[];
  fetchDataStatus: StatusType;
  toggleSidebar: (value?: boolean) => void;
  fetchData: () => void;
  getNodeDefinition: (nodeType: string) => PaletteItem | undefined;
};

export function usePaletteSlice(set: SetDiagramState, get: GetDiagramState): PaletteState {
  return {
    isSidebarExpanded: false,
    data: [],
    fetchDataStatus: StatusType.Idle,
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

      // Defer to the next macrotask: a concurrent node load (its own store
      // update) may still be pending, and nodes that arrived before the palette
      // were validated against an empty definition set, so their errors were
      // dropped. Re-validating after the queue drains repairs them (WB-340).
      // A macrotask (not `queueMicrotask`) is deliberate — we must yield past
      // those pending state updates, not just the current microtask queue.
      setTimeout(() => refreshNodesErrorsIfNeeded(), 0);
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

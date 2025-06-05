import { GetDiagramState, SetDiagramState } from '@/store/store';
import { delay } from '@/utils/common';
import { localStorageKey } from '@workflow-builder/types/consts';
import { showSnackbar } from '@/utils/show-snackbar';
import { SnackbarType } from '@synergycodes/axiom';
import { DiagramModel, StatusType } from '@workflow-builder/types/common';

export function loadDiagram(set: SetDiagramState, get: GetDiagramState) {
  return async () => {
    set({ loadDiagramStatus: StatusType.Loading });

    const data = await loadData(onError);

    if (data) {
      const { name, diagram } = data;

      set({
        documentName: name,
        nodes: diagram.nodes,
        loadDiagramStatus: StatusType.Success,
      });

      set({
        edges: diagram.edges,
      });

      get().reactFlowInstance?.setViewport(diagram.viewport);

      await delay(500);
    } else {
      showSnackbar({
        title: 'noDiagramToLoad',
        variant: SnackbarType.ERROR,
      });
    }

    set({ loadDiagramStatus: StatusType.Idle });
  };

  function onError() {
    set({ loadDiagramStatus: StatusType.Error });
    showSnackbar({
      title: 'loadDiagramError',
      variant: SnackbarType.ERROR,
    });
  }
}

async function loadData(onError: () => void): Promise<DiagramModel | null> {
  // TODO: use when database is available for the project
  // const response = await fetch(environment.loadDiagramApiUrl).catch(onError);
  // if (!response) {
  //   return;
  // }
  try {
    // TODO: use when database is available for the project
    // const json = await response.json()
    const json = globalThis.localStorage.getItem(localStorageKey) || '';
    return JSON.parse(json) as DiagramModel;
  } catch {
    onError();
  }

  return null;
}

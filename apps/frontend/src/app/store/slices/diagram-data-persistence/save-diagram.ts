import { localStorageKey } from '@workflow-builder/types/consts';
import { showSnackbar } from '@/utils/show-snackbar';
import { SnackbarType } from '@synergycodes/axiom';
import { DiagramState } from '../diagram-slice';

export function saveDiagram(get: () => DiagramState) {
  return (showNotification = true) => {
    try {
      const { reactFlowInstance, documentName, layoutDirection } = get();
      const data = reactFlowInstance?.toObject();
      const model = {
        name: documentName || '',
        layoutDirection: layoutDirection,
        diagram: data,
      };

      const json = JSON.stringify(model);
      localStorage.setItem(localStorageKey, json);

      if (!showNotification) {
        return;
      }

      showSnackbar({
        title: 'saveDiagramSuccess',
        variant: SnackbarType.SUCCESS,
      });
    } catch {
      onError();
    }
  };
}

function onError() {
  showSnackbar({
    title: 'saveDiagramError',
    variant: SnackbarType.ERROR,
  });
}

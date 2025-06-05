import { useEffect, useRef } from 'react';
import useStore from '@/store/store';
import type { DiagramModel } from '@workflow-builder/types/common';
import { localStorageKey } from '@/utils/consts';
import { showSnackbar } from '@/utils/show-snackbar';
import { useTemplateSelectionModal } from './use-welcome-modal';
import { SnackbarType } from '@synergycodes/axiom';

export function useAutoload() {
  const setDiagramModel = useStore((store) => store.setDiagramModel);
  const { openTemplateSelectionModal } = useTemplateSelectionModal();
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) {
      return;
    }

    const stringifiedModel = localStorage.getItem(localStorageKey);

    if (!stringifiedModel) {
      openTemplateSelectionModal({ shouldSetEmptyOnClose: true });
      return;
    }

    try {
      const model: DiagramModel = JSON.parse(stringifiedModel);
      setDiagramModel(model, false);
      hasLoaded.current = true;

      showSnackbar({
        title: 'restoreDiagramSuccess',
        variant: SnackbarType.SUCCESS,
      });
    } catch (error) {
      console.error(error);

      showSnackbar({
        title: 'restoreDiagramError',
        variant: SnackbarType.ERROR,
      });
    }
  }, [openTemplateSelectionModal, setDiagramModel]);
}

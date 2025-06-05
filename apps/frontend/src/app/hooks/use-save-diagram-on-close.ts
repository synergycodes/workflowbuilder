import useStore from '@/store/store';
import { useContext, useEffect } from 'react';
import { UndoRedoContext } from '../providers/undo-redo-provider';

export function useSaveDiagramOnClose() {
  const saveDiagram = useStore((store) => store.saveDiagram);
  const { canUndo: isDirty } = useContext(UndoRedoContext);

  useEffect(() => {
    function handler() {
      if (isDirty) {
        saveDiagram(false);
      }
    }

    window.addEventListener('beforeunload', handler);

    return () => window.removeEventListener('beforeunload', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);
}

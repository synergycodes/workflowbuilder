import { useKeyPress } from '@workflowbuilder/sdk';
import { useEffect } from 'react';

import { redo, undo } from '../stores/use-undo-redo-store';

export const useUndoRedoKeyboardHandler = () => {
  const z = useKeyPress('z', { withControlOrMeta: true, skipTarget: true });
  const y = useKeyPress('y', { withControlOrMeta: true, skipTarget: true });

  useEffect(() => {
    if (z) {
      undo();
    }
  }, [z]);

  useEffect(() => {
    if (y) {
      redo();
    }
  }, [y]);
};

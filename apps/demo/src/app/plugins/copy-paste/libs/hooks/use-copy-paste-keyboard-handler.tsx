import { useEffect } from 'react';

import type { KeyboardHandler } from '../types';
import { useKeyPress } from './use-key-press';

/**
 * React hook to handle keyboard shortcuts for cut, copy, and paste actions.
 *
 * Listens for Ctrl/Cmd+X, Ctrl/Cmd+C, and Ctrl/Cmd+V and triggers the provided handlers.
 *
 * @param handleCut - Callback for cut action
 * @param handleCopy - Callback for copy action
 * @param handlePaste - Callback for paste action
 * @returns void
 */
export const useCopyPasteKeyboardHandler = ({ handleCut, handleCopy, handlePaste }: KeyboardHandler) => {
  const x = useKeyPress('x', { withControlOrMeta: true });
  const c = useKeyPress('c', { withControlOrMeta: true });
  const v = useKeyPress('v', { withControlOrMeta: true });

  useEffect(() => {
    if (x) {
      handleCut();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x]);

  useEffect(() => {
    if (c) {
      handleCopy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c]);

  useEffect(() => {
    if (v) {
      handlePaste();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
};

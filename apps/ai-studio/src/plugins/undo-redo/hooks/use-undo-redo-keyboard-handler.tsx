import { useEffect } from 'react';

import { redo, undo } from '../stores/use-undo-redo-store';

function isTextTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export const useUndoRedoKeyboardHandler = () => {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // `event.repeat` guards held-key OS auto-repeat; text fields keep their native undo.
      if (!(event.ctrlKey || event.metaKey) || event.repeat || isTextTarget(event.target)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === 'y') {
        event.preventDefault();
        redo();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
};

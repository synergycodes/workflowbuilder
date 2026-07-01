import { type ReactNode, memo } from 'react';

import { useUndoRedoKeyboardHandler } from '../hooks/use-undo-redo-keyboard-handler';

type UndoRedoProviderProps = {
  children: ReactNode;
};

function UndoRedoProviderComponent({ children }: UndoRedoProviderProps) {
  useUndoRedoKeyboardHandler();

  return children;
}

export const UndoRedoProvider = memo(UndoRedoProviderComponent);

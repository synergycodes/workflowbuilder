import { useStore } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { undo } from '../stores/use-undo-redo-store';
import { useUndoRedoKeyboardHandler } from './use-undo-redo-keyboard-handler';

vi.mock('../stores/use-undo-redo-store', () => ({ undo: vi.fn(), redo: vi.fn() }));

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  useUndoRedoKeyboardHandler();
  return null;
}

const pressUndo = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));

describe('useUndoRedoKeyboardHandler', () => {
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.mocked(undo).mockReset();
    useStore.getState().setToggleReadOnlyMode(false);
    root = createRoot(document.createElement('div'));
    act(() => root.render(<Probe />));
  });

  afterEach(() => {
    act(() => root.unmount());
    useStore.getState().setToggleReadOnlyMode(false);
  });

  it('undoes on Ctrl+Z', () => {
    pressUndo();

    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('leaves the diagram alone while it is read-only', () => {
    useStore.getState().setToggleReadOnlyMode(true);

    pressUndo();

    expect(undo).not.toHaveBeenCalled();
  });
});

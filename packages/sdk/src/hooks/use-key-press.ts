import type { KeyCode } from '@xyflow/react';
import { useCallback, useEffect, useState } from 'react';

type Options = {
  withControlOrMeta?: boolean;
  skipTarget?: boolean;
};

/**
 * Tracks whether a given key (or key combo) is currently held down.
 *
 * Defaults to firing only when the diagram canvas (body / `.react-flow__*`)
 * has focus — text inputs are excluded so typing in a property field
 * doesn't accidentally trigger keyboard shortcuts. Pass `skipTarget: true`
 * to listen globally and `withControlOrMeta: true` to require Ctrl / Cmd
 * to also be down.
 *
 * @param keyCode - xyflow `KeyCode` (single key string or combo).
 * @param options - Optional `skipTarget` / `withControlOrMeta` flags.
 * @returns `true` while the key is pressed; `false` otherwise.
 *
 * @category Hooks
 */
// TODO: Use custom useKeyPress simplified from reactflow as long as
// this issue won't be fixed: https://github.com/xyflow/xyflow/issues/2248
export function useKeyPress(keyCode: KeyCode, options?: Options): boolean {
  const [keyPressed, setKeyPressed] = useState(false);

  const keyHandler = useCallback(
    (event: KeyboardEvent, pressed: boolean) => {
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      const canHandleClick =
        event.key === keyCode &&
        (options?.skipTarget || isReactFlowDiagramTarget(event.target)) &&
        (!options?.withControlOrMeta || ctrlOrMeta);

      if (canHandleClick) {
        event.preventDefault();
        setKeyPressed(pressed);
      }
    },
    [keyCode, options],
  );

  useEffect(() => {
    function downHandler(event: KeyboardEvent) {
      keyHandler(event, true);

      // Keyup event is not fired when 'command button is pressed, so we have to manually trigger the function
      // https://blog.bitsrc.io/keyup-event-and-cmd-problem-88f4038c5ed2
      setTimeout(() => upHandler(event), 100);
    }

    function upHandler(event: KeyboardEvent) {
      const isInput =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLButtonElement;

      if (!isInput) {
        event.preventDefault();
      }
      setKeyPressed(false);
    }

    function resetHandler() {
      return setKeyPressed(false);
    }

    document.addEventListener('keydown', downHandler);
    document.addEventListener('keyup', upHandler);
    window.addEventListener('blur', resetHandler);

    return () => {
      document.removeEventListener('keydown', downHandler);
      document.removeEventListener('keyup', upHandler);
      window.removeEventListener('blur', resetHandler);
    };
  }, [setKeyPressed, keyHandler]);

  return keyPressed;
}

function isReactFlowDiagramTarget(target: EventTarget | null) {
  if (!target) {
    return false;
  }
  const targetElement = target as Element;

  const isTarget = [
    targetElement.tagName === 'BODY',
    targetElement.classList.contains('react-flow__edge'),
    targetElement.classList.contains('react-flow__node'),
    // It is created when someone selects a rectangle with Shift and drags.
    targetElement.classList.contains('react-flow__nodesselection-rect'),
  ].some(Boolean);

  return isTarget;
}

import type { KeyCode } from '@xyflow/react';
import { useCallback, useEffect, useState } from 'react';

type Options = {
  withControlOrMeta?: boolean;
  skipTarget?: boolean;
};

// TODO: Use custom useKeyPress simplified from reactflow as long as
// this issue won't be fixed: https://github.com/xyflow/xyflow/issues/2248

/**
 * React hook to listen for a specific key press, with optional modifiers.
 *
 * Returns true if the specified key is currently pressed. Useful for keyboard accessibility and custom shortcuts.
 *
 * @param keyCode - The key to listen for
 * @param options - Optional configuration object
 * @param options.withControlOrMeta - Require Ctrl/Meta key
 * @param options.skipTarget - Skip target check
 * @returns Boolean indicating if the key is pressed
 */
export const useKeyPress = (keyCode: KeyCode, options?: Options): boolean => {
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
    const downHandler = (event: KeyboardEvent) => {
      keyHandler(event, true);

      // Keyup event is not fired when 'command button is pressed, so we have to manually trigger the function
      // https://blog.bitsrc.io/keyup-event-and-cmd-problem-88f4038c5ed2
      setTimeout(() => upHandler(event), 100);
    };

    const upHandler = (event: KeyboardEvent) => {
      event.preventDefault();
      setKeyPressed(false);
    };

    const resetHandler = () => setKeyPressed(false);

    document.addEventListener('keydown', downHandler);
    document.addEventListener('keyup', upHandler);
    window.addEventListener('blur', resetHandler);

    return () => {
      document.removeEventListener('keydown', downHandler);
      document.removeEventListener('keyup', upHandler);
      window.removeEventListener('blur', resetHandler);
    };
  }, [keyHandler]);

  return keyPressed;
};

const isReactFlowDiagramTarget = (target: EventTarget | null) => {
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
};

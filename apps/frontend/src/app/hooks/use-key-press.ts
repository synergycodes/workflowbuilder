import { useCallback, useEffect, useState } from 'react';
import { KeyCode } from '@xyflow/react';

type Options = {
  withControlOrMeta?: boolean;
  skipTarget?: boolean;
};

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
  return (
    targetElement.tagName === 'BODY' ||
    targetElement.classList.contains('react-flow__edge') ||
    targetElement.classList.contains('react-flow__node')
  );
}

import { useState } from 'react';

import type { LayoutDirection } from '../../../../node/common';
import { useStore } from '../../../../store/store';
import { trackFutureChange } from '../../../changes-tracker/stores/use-changes-tracker-store';
import { useAppBar } from '../../app-bar-context';

export function useCleanUp() {
  const { onCleanUp } = useAppBar();
  const layoutDirection = useStore((state) => state.layoutDirection);
  const setLayoutDirection = useStore((state) => state.setLayoutDirection);
  const isEmptyCanvas = useStore((state) => state.nodes.length === 0);
  const isReadOnly = useStore((state) => state.isReadOnly);
  const [isPending, setIsPending] = useState<boolean>(false);

  const cleanUp = (direction: LayoutDirection) => {
    if (!onCleanUp || isPending) {
      return;
    }

    const result = onCleanUp(direction);
    if (result instanceof Promise) {
      setIsPending(true);
      result.finally(() => setIsPending(false)).catch(() => {});
    }
  };

  const arrange = (direction: LayoutDirection) => {
    if (isPending) {
      return;
    }

    trackFutureChange('layoutDirection', { direction });
    setLayoutDirection(direction);
    cleanUp(direction);
  };

  return {
    isAvailable: Boolean(onCleanUp),
    layoutDirection,
    isPending,
    isDisabled: isEmptyCanvas || isReadOnly,
    cleanUp,
    arrange,
  };
}

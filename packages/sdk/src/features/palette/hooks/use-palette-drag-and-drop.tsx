import { useRef } from 'react';

import type { PaletteItem } from '../../../node/common';
import { useStore } from '../../../store/store';
import { setDraggedItem } from '../stores/use-palette-store';

export function usePaletteDragAndDrop(canDrag: boolean) {
  const zoom = useStore((state) => state.reactFlowInstance?.getZoom() || 1);
  const ref = useRef<HTMLDivElement>(null);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>, item: PaletteItem) {
    if (!canDrag) {
      return event.preventDefault();
    }
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    setDraggedItem(item);
  }

  return {
    zoom,
    ref,
    onPointerDown,
  };
}

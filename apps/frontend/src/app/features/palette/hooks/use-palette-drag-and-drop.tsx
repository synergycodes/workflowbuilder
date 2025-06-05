import useStore from '@/store/store';
import { useRef, DragEvent } from 'react';
import { dataFormat } from '@/utils/consts';

export function usePaletteDragAndDrop(canDrag: boolean) {
  const setDraggedItem = useStore((state) => state.setDraggedItem);
  const draggedItem = useStore((state) => state.draggedItem);
  const zoom = useStore((state) => state.reactFlowInstance?.getZoom() || 1);

  const ref = useRef<HTMLDivElement>(null);

  function onMouseDown(type: string) {
    if (canDrag) {
      setDraggedItem({ type });
    }
  }

  function onDragStart(event: DragEvent) {
    if (!canDrag) {
      return event.preventDefault();
    }
    event.dataTransfer.setDragImage(ref.current as Element, 0, 0);
    event.dataTransfer.setData(dataFormat, JSON.stringify(draggedItem));
  }

  return {
    draggedItem,
    zoom,
    ref,
    onMouseDown,
    onDragStart,
  };
}

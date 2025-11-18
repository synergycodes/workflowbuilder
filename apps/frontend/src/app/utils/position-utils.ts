import { SNAP_GRID, SNAP_IS_ACTIVE } from '@/features/diagram/diagram.const';

export function snapToGridIfNeeded(node?: { x?: number; y?: number }) {
  const { x = 0, y = 0 } = node || {};

  if (SNAP_IS_ACTIVE) {
    const gridSizeX = SNAP_GRID?.[0] ?? 0;
    const gridSizeY = SNAP_GRID?.[1] ?? 0;

    return {
      x: Math.round(x / gridSizeX) * gridSizeX,
      y: Math.round(y / gridSizeY) * gridSizeY,
    };
  }

  return {
    x,
    y,
  };
}

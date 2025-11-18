import { LayoutDirection, layoutDirections } from '@workflow-builder/types/common';

export function getIsValidLayoutDirections(value?: unknown) {
  if (typeof value !== 'string') {
    return false;
  }

  return layoutDirections.includes(value as LayoutDirection);
}

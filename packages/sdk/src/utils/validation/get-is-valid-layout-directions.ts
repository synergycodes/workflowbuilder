import { type LayoutDirection, layoutDirections } from '../../node/common';

export function getIsValidLayoutDirections(value?: unknown) {
  if (typeof value !== 'string') {
    return false;
  }

  return layoutDirections.includes(value as LayoutDirection);
}

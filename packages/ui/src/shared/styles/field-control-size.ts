import type { ItemSize } from '../types/item-size';

export const FIELD_CONTROL_SIZE_BY_ITEM_SIZE = {
  large: 'l',
  medium: 'm',
  small: 's',
} as const satisfies Record<ItemSize, string>;

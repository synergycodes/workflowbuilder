import { ItemSize } from '@ui/shared/types/item-size';
import { ListItem } from '@ui/shared/types/list-item';

export const MENU_ITEM_TONES = ['default', 'critical'] as const;

/**
 * Colour tone of a menu item. `critical` marks a destructive action.
 *
 * @category Menu
 */
export type MenuItemTone = (typeof MENU_ITEM_TONES)[number];

/**
 * One entry of a `Menu`'s `items`.
 *
 * @category Menu
 */
export type MenuItemProps = ListItem & {
  /**
   * Keys the row. Two items with the same `label` need distinct ids; without
   * one the row is keyed by its `label`.
   */
  id?: string;
  /**
   * Colours the label and icon for a destructive action. The row keeps the
   * background every other row has.
   * @default 'default'
   */
  tone?: MenuItemTone;
  /**
   * Marks the item as the current choice. When any item of a menu defines
   * `selected`, the menu wraps its items in a radio group and renders the
   * items that define it as `menuitemradio` with `aria-checked`, highlighting
   * the selected one. Items that leave it undefined stay plain `menuitem`s.
   */
  selected?: boolean;
  onClick?: () => void;
  /** Ignored: `Menu` sizes every row with its own `size` prop. */
  size?: ItemSize;
};

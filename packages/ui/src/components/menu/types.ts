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
   * Colours the label and icon for a destructive action. The row keeps the
   * background every other row has.
   * @default 'default'
   */
  tone?: MenuItemTone;
  /**
   * Marks the item as the current choice. When any item of a menu defines
   * `selected`, the menu renders its items as a radio group
   * (`menuitemradio` with `aria-checked`) and highlights the selected one.
   */
  selected?: boolean;
  /** Called when the item is chosen. */
  onClick?: () => void;
  /** Ignored: `Menu` sizes every row with its own `size` prop. */
  size?: ItemSize;
};

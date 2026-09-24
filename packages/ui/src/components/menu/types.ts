import { ItemSize } from '@ui/shared/types/item-size';
import { ListItem } from '@ui/shared/types/list-item';

export const MENU_ITEM_TONES = ['default', 'critical'] as const;

export type MenuItemTone = (typeof MENU_ITEM_TONES)[number];

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
  onClick?: () => void;
  size?: ItemSize;
};

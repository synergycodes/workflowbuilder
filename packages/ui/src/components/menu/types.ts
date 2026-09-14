import { ItemSize } from '@ui/shared/types/item-size';
import { ListItem } from '@ui/shared/types/list-item';

export type MenuItemProps = ListItem & {
  destructive?: boolean;
  /**
   * Marks the item as the current choice. When any item of a menu defines
   * `selected`, the menu renders its items as a radio group
   * (`menuitemradio` with `aria-checked`) and highlights the selected one.
   */
  selected?: boolean;
  onClick?: () => void;
  size?: ItemSize;
};

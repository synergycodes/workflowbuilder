import { ItemSize } from '@ui/shared/types/item-size';
import { ListItem } from '@ui/shared/types/list-item';

export type MenuItemProps = ListItem & {
  destructive?: boolean;
  onClick?: () => void;
  size?: ItemSize;
};

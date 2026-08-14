import { Menu as MenuBase } from '@base-ui/react/menu';
import clsx from 'clsx';

import listItemSize from '@ui/shared/styles/list-item-size.module.css';
import listItemStyles from '@ui/shared/styles/list-item.module.css';

import { MenuItemProps } from './types';

export function MenuItem({ icon, label, disabled, destructive, size = 'medium', onClick }: MenuItemProps) {
  return (
    <MenuBase.Item
      disabled={disabled}
      className={clsx(listItemStyles['list-item'], listItemSize[size], {
        [listItemStyles['destructive']]: destructive,
      })}
      onClick={onClick}
    >
      {icon}
      {label}
    </MenuBase.Item>
  );
}

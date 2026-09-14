import { Menu as MenuBase } from '@base-ui/react/menu';
import clsx from 'clsx';

import listItemSize from '@ui/shared/styles/list-item-size.module.css';
import listItemStyles from '@ui/shared/styles/list-item.module.css';

import { MenuItemProps } from './types';

type Props = MenuItemProps & {
  /** Render as a radio item; set by `Menu` when the item list carries a selection. */
  radio?: boolean;
};

// `selected` is consumed by `Menu` (radio group value); it is destructured here so
// it never reaches the DOM element.
export function MenuItem({
  icon,
  label,
  disabled,
  destructive,
  selected: _selected,
  radio,
  size = 'medium',
  onClick,
}: Props) {
  const className = clsx(listItemStyles['list-item'], listItemSize[size], {
    [listItemStyles['destructive']]: destructive,
  });

  if (radio) {
    return (
      <MenuBase.RadioItem value={label} disabled={disabled} className={className} closeOnClick onClick={onClick}>
        {icon}
        {label}
      </MenuBase.RadioItem>
    );
  }

  return (
    <MenuBase.Item disabled={disabled} className={className} onClick={onClick}>
      {icon}
      {label}
    </MenuBase.Item>
  );
}

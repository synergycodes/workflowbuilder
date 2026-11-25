import { Menu as MenuBase } from '@base-ui/react/menu';
import { Check } from '@phosphor-icons/react';
import type { ItemSize } from '@ui/shared/types/item-size';
import clsx from 'clsx';

import listItemSize from '@ui/shared/styles/list-item-size.module.css';
import listItemStyles from '@ui/shared/styles/list-item.module.css';

import { MenuItemProps } from './types';

type Props = MenuItemProps & {
  /** Render as a radio item; set by `Menu` when the item list carries a selection. */
  radio?: boolean;
  /** Set by `Menu` from its own `size`. */
  size?: ItemSize;
};

// `selected` and `id` are consumed by `Menu` (radio group value, row key); they are
// destructured here so they never reach the DOM element.
export function MenuItem({
  id: _id,
  icon,
  label,
  disabled,
  tone = 'default',
  selected: _selected,
  radio,
  size = 'm',
  onClick,
}: Props) {
  const className = clsx(listItemStyles['list-item'], listItemSize[size], {
    [listItemStyles['critical']]: tone === 'critical',
  });

  if (radio) {
    return (
      <MenuBase.RadioItem value={label} disabled={disabled} className={className} closeOnClick onClick={onClick}>
        {icon}
        {label}
        <MenuBase.RadioItemIndicator className={listItemStyles['indicator']}>
          <Check weight="bold" />
        </MenuBase.RadioItemIndicator>
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

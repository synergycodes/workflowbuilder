import { Select as SelectBase } from '@base-ui/react/select';
import type { ItemSize } from '@ui/shared/types/item-size';
import clsx from 'clsx';

import listItemSize from '@ui/shared/styles/list-item-size.module.css';
import listItemStyles from '@ui/shared/styles/list-item.module.css';

import type { SelectItem } from '../types';

type SelectOptionProps = SelectItem & {
  size?: ItemSize;
};

export function SelectOption({ icon, value, label, size = 'medium', disabled }: SelectOptionProps) {
  return (
    <SelectBase.Item
      className={clsx(listItemStyles['list-item'], listItemSize[size])}
      value={value}
      label={label}
      disabled={disabled}
    >
      {icon}
      {label}
    </SelectBase.Item>
  );
}

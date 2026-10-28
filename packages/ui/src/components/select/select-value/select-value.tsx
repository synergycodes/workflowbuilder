import clsx from 'clsx';

import style from './select-value.module.css';

import type { SelectItem } from '../types';

type SelectValueProps = {
  value: string | number | null;
  items: SelectItem[];
  placeholder?: string;
};

export function SelectValue({ value, items, placeholder }: SelectValueProps) {
  const selectedOption = items.find((item) => item.value === value);
  const label = selectedOption?.label ?? placeholder;

  return (
    <div className={style['container']}>
      {selectedOption?.icon}
      <span
        className={clsx({
          [style['placeholder']]: selectedOption == null,
        })}
      >
        {label}
      </span>
    </div>
  );
}

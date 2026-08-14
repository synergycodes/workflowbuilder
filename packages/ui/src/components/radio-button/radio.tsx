import { SelectorSize } from '@ui/shared/types/selector-size';
import clsx from 'clsx';
import { InputHTMLAttributes } from 'react';

import radioButtonSizeStyles from './radio-size.module.css';
import radioButtonStyles from './radio.module.css';

export type RadioProps = {
  /**
   * The size of the radio button
   * @default 'medium'
   */
  size?: SelectorSize;
  /** Whether the radio button is checked */
  checked?: boolean;
  /** The name of the radio button group */
  name: string;
  /** The value of the radio button */
  value: string | number;
  /** Callback fired when the radio button state changes */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'value' | 'name'>;

/**
 * A radio button component that allows users to select a single option from a group.
 */
export function Radio({ size = 'medium', className, checked, name, value, onChange, ...props }: RadioProps) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange?.(event);
  }

  return (
    <label className={radioButtonStyles['wrapper']}>
      <input
        type="radio"
        className={clsx(radioButtonStyles['radio'], radioButtonSizeStyles[size], className)}
        name={name}
        value={value}
        checked={checked}
        onChange={handleChange}
        {...props}
      />
    </label>
  );
}

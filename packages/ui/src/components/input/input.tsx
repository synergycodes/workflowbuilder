import { Input as InputBase } from '@base-ui/react/input';
import clsx from 'clsx';

import inputRootStyles from './input-root.module.css';
import inputStyles from './input.module.css';
import './variables.css';
import inputFontStyles from '@ui/shared/styles/input-font-size.module.css';
import inputSizeStyles from '@ui/shared/styles/input-size.module.css';

import type { InputProps } from './types';

export function Input({
  size = 'medium',
  startAdornment,
  endAdornment,
  error = false,
  className,
  ...props
}: InputProps) {
  return (
    <div
      className={clsx(
        inputRootStyles['input-root'],
        inputSizeStyles[size],
        {
          'base--error': error,
          'base--disabled': props.disabled,
        },
        className,
      )}
      // The padding lives on this wrapper, not on the <input>, so a click in
      // the padding area lands here and the field never gains focus - forward
      // it (adornment clicks keep their own behavior: target !== currentTarget).
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.currentTarget.querySelector('input')?.focus();
      }}
    >
      {startAdornment}
      <InputBase {...props} className={clsx(inputStyles['input'], inputFontStyles[size])} />
      {endAdornment}
    </div>
  );
}

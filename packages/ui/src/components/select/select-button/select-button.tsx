import { CaretDown } from '@phosphor-icons/react';
import type { WithIcon } from '@ui/shared/types/with-icon';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

export const SelectButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'> & WithIcon>(
  function SelectButton({ icon, children, ...rest }, ref) {
    return (
      <button type="button" {...rest} ref={ref}>
        {children}
        {icon ?? <CaretDown weight="bold" />}
      </button>
    );
  },
);

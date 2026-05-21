import type { ItemSize } from '@synergycodes/overflow-ui';
import clsx from 'clsx';
import type { PropsWithChildren } from 'react';

import styles from './form-control-with-label.module.css';

import { Label } from '../label/label';

type Props = {
  label: string;
  className?: string;
  required?: boolean;
  size?: ItemSize;
};

/**
 * Wraps an arbitrary form control (input, select, etc.) with a positioned
 * `<Label>` and an optional `*` indicator for required fields. Used inside
 * custom JsonForms renderers and properties-bar tabs to keep label + control
 * spacing consistent with the rest of the editor's form UI.
 *
 * @category Components
 */
export function FormControlWithLabel({
  label,
  className,
  required,
  size = 'medium',
  children,
}: PropsWithChildren<Props>) {
  return (
    <div className={clsx(styles['container'], { [className || '']: className })}>
      <Label label={label} required={required} size={size} />
      {children}
    </div>
  );
}

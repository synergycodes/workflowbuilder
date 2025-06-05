import styles from './form-control-with-label.module.css';

import { Label } from '../label/label';
import { PropsWithChildren } from 'react';
import { ItemSize } from '@synergycodes/axiom';

type Props = {
  label: string;
  required?: boolean;
  size?: ItemSize;
};

export function FormControlWithLabel({ label, required, size = 'medium', children }: PropsWithChildren<Props>) {
  return (
    <div className={styles['container']}>
      <Label label={label} required={required} size={size} />
      {children}
    </div>
  );
}

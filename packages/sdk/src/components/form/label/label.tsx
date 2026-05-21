import { Asterisk } from '@phosphor-icons/react';
import type { ItemSize } from '@synergycodes/overflow-ui';
import clsx from 'clsx';

import styles from './label.module.css';

import { useTranslateIfPossible } from '../../../hooks/use-translate-if-possible';

export type LabelVariant = 'default' | 'title';

type LabelProps = {
  label: string;
  required?: boolean;
  size?: ItemSize;
  variant?: LabelVariant;
};

export function Label({ label, required, size = 'medium', variant = 'default' }: LabelProps) {
  const translateIfPossible = useTranslateIfPossible();

  return (
    <span className={clsx(styles['container'], styles[size])}>
      {required && <Asterisk />}
      <span className={clsx(styles['label'], styles[variant])}>{translateIfPossible(label) ?? label}</span>
    </span>
  );
}

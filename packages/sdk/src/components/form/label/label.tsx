import asteriskIcon from '@iconify-icons/ph/asterisk';
import type { ItemSize } from '@workflowbuilder/ui';
import clsx from 'clsx';

import styles from './label.module.css';

import { useTranslateIfPossible } from '../../../hooks/use-translate-if-possible';
import { Icon } from '../../../icon/icon';

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
      {required && <Icon icon={asteriskIcon} size="inherit" />}
      <span className={clsx(styles['label'], styles[variant])}>{translateIfPossible(label) ?? label}</span>
    </span>
  );
}

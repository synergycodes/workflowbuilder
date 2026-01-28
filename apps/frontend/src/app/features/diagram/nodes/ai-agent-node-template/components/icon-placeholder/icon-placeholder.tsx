import clsx from 'clsx';
import { PropsWithChildren } from 'react';

import styles from './icon-placeholder.module.css';

type Props = {
  className?: string;
};

export function IconPlaceholder({ className, children }: PropsWithChildren<Props>) {
  return <div className={clsx(styles['container'], className)}>{children}</div>;
}

import clsx from 'clsx';
import styles from './icon-placeholder.module.css';

import { PropsWithChildren } from 'react';

type Props = {
  className?: string;
};

export function IconPlaceholder({ className, children }: PropsWithChildren<Props>) {
  return <div className={clsx(styles['container'], className)}>{children}</div>;
}

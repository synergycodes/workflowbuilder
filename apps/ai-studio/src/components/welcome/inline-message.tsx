import { Info, Warning } from '@phosphor-icons/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

import styles from './inline-message.module.css';

type Props = {
  tone: 'info' | 'warning';
  children: ReactNode;
  id?: string;
};

// Static text, never role="alert": in a dialog it is read as part of the content.
export function InlineMessage({ tone, children, id }: Props) {
  const Glyph = tone === 'warning' ? Warning : Info;

  return (
    <div className={clsx(styles['message'], styles[tone])}>
      <Glyph className={styles['icon']} aria-hidden="true" />
      <p id={id} className={clsx('wb-text-body-s', styles['text'])}>
        {children}
      </p>
    </div>
  );
}

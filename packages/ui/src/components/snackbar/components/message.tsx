import clsx from 'clsx';

import styles from './message.module.css';

type MessageProps = {
  title: string;
  subtitle: string | undefined;
};

export function Message({ title, subtitle }: MessageProps) {
  return (
    <div className={styles['container']}>
      <span className={clsx(styles['title'], 'wb-text-title-s-emphasized')}>{title}</span>
      {subtitle && <span className={clsx(styles['subtitle'], 'wb-text-body-s')}>{subtitle}</span>}
    </div>
  );
}

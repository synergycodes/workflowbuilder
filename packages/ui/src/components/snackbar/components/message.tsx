import clsx from 'clsx';

import styles from './message.module.css';

type MessageProps = {
  title: string;
  subtitle: string | undefined;
};

export function Message({ title, subtitle }: MessageProps) {
  return (
    <div className={styles['container']}>
      <span className={clsx(styles['title'], 'ax-public-h8')}>{title}</span>
      {subtitle && <span className={clsx(styles['subtitle'], 'ax-public-p10')}>{subtitle}</span>}
    </div>
  );
}

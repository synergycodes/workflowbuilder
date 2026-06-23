import clsx from 'clsx';

import styles from './node-description.module.css';

type Props = {
  label: string;
  description?: string;
  className?: string;
};

export function NodeDescription({ label, description, className }: Props) {
  return (
    <div className={clsx(styles['container'], className)}>
      <span className={clsx('ax-public-h9', styles['title'])}>{label}</span>
      <span className={clsx('ax-public-p11', styles['subtitle'])}>{description}</span>
    </div>
  );
}

import clsx from 'clsx';

import styles from './node-description.module.css';

export type NodeDescriptionProps = {
  label: string;
  description?: string;
  className?: string;
};

export function NodeDescription({ label, description, className }: NodeDescriptionProps) {
  return (
    <div className={clsx(styles['container'], className)}>
      <span className={clsx('wb-text-title-s-emphasized', styles['title'])}>{label}</span>
      <span className={clsx('wb-text-node-s', styles['subtitle'])}>{description}</span>
    </div>
  );
}

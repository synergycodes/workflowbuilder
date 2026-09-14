import clsx from 'clsx';

import styles from './node-description.module.css';

export type NodeDescriptionProps = {
  label: string;
  description?: string;
  /** Muted title and subtitle of the Node Disabled variant. */
  disabled?: boolean;
  className?: string;
};

export function NodeDescription({ label, description, disabled = false, className }: NodeDescriptionProps) {
  return (
    <div className={clsx(styles['container'], { [styles['disabled']]: disabled }, className)}>
      <span className={clsx('wb-text-title-s-emphasized', styles['title'])} title={label}>
        {label}
      </span>
      <span className={clsx('wb-text-node-s', styles['subtitle'])} title={description}>
        {description}
      </span>
    </div>
  );
}

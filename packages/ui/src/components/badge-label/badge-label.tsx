import clsx from 'clsx';
import { HTMLAttributes, ReactNode, forwardRef } from 'react';

import styles from './badge-label.module.css';

export type BadgeLabelProps = {
  label: ReactNode;
  /**
   * @default 'm'
   */
  size?: BadgeLabelSize;
  /**
   * @default 'default'
   */
  variant?: BadgeLabelVariant;
  /**
   * Optional glyph before the label, rendered decorative (`aria-hidden`).
   */
  icon?: ReactNode;
} & HTMLAttributes<HTMLSpanElement>;

/**
 * @category Badge Label
 */
export type BadgeLabelSize = 'm' | 's';
/**
 * @category Badge Label
 */
export type BadgeLabelVariant = 'default' | 'inverse';

/**
 * Read-only uppercase label. Recolour it by overriding `--wb-public-badge-label-background-color`,
 * `-color` and `-icon-color` (the `-inverse` ones for the Inverse variant) on `:root` or one instance.
 *
 * @category Badge Label
 */
export const BadgeLabel = forwardRef<HTMLSpanElement, BadgeLabelProps>(
  ({ label, size = 'm', variant = 'default', icon, className, ...rest }, ref) => {
    return (
      <span
        ref={ref}
        {...rest}
        className={clsx(styles['badge-label'], styles[variant], styles[size], 'wb-text-label-s-emphasized', className)}
      >
        {icon && (
          <span className={styles['icon']} aria-hidden="true">
            {icon}
          </span>
        )}
        {label}
      </span>
    );
  },
);

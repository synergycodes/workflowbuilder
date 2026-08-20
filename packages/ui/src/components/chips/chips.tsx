import { X } from '@phosphor-icons/react';
import clsx from 'clsx';
import { HTMLAttributes, ReactNode, forwardRef } from 'react';

import styles from './chips.module.css';

export type ChipProps = {
  /**
   * The tag text.
   */
  label: string;
  /**
   * Solid renders on the neutral chip surface; outline renders the brand
   * outline treatment.
   * @default 'solid'
   */
  variant?: ChipVariant;
  /**
   * @default 'm'
   */
  size?: ChipSize;
  /**
   * Icon rendered before the label.
   */
  prefixIcon?: ReactNode;
  /**
   * When provided, a close affordance is rendered and invokes this callback.
   */
  onClose?: () => void;
  /**
   * Accessible name of the close affordance.
   * @default `Remove ${label}`
   */
  closeLabel?: string;
} & HTMLAttributes<HTMLSpanElement>;

export type ChipVariant = 'solid' | 'outline';
export type ChipSize = 's' | 'm' | 'l' | 'xl';

/**
 * Compact tag for labeling and filtering, in the two DS 2.0 treatments.
 */
export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ label, variant = 'solid', size = 'm', prefixIcon, onClose, closeLabel, className, ...rest }, ref) => {
    return (
      <span ref={ref} {...rest} className={clsx(styles['chip'], styles[variant], styles[size], className)}>
        {prefixIcon && <span className={styles['icon']}>{prefixIcon}</span>}
        <span className="wb-text-label-s">{label}</span>
        {onClose && (
          <button
            type="button"
            className={styles['close']}
            aria-label={closeLabel ?? `Remove ${label}`}
            onClick={onClose}
          >
            <X />
          </button>
        )}
      </span>
    );
  },
);

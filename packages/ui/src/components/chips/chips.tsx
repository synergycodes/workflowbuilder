import { X } from '@phosphor-icons/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

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
  variant?: Variant;
  /**
   * @default 'm'
   */
  size?: Size;
  /**
   * Icon rendered before the label.
   */
  prefixIcon?: ReactNode;
  /**
   * When provided, a close affordance is rendered and invokes this callback.
   */
  onClose?: () => void;
  className?: string;
};

type Variant = 'solid' | 'outline';
type Size = 's' | 'm' | 'l' | 'xl';

/**
 * Compact tag for labeling and filtering, in the two DS 2.0 treatments.
 */
export function Chip({ label, variant = 'solid', size = 'm', prefixIcon, onClose, className }: ChipProps) {
  return (
    <span className={clsx(styles['chip'], styles[variant], styles[size], className)}>
      {prefixIcon && <span className={styles['icon']}>{prefixIcon}</span>}
      <span className="wb-text-label-s">{label}</span>
      {onClose && (
        <button type="button" className={styles['close']} aria-label={`Remove ${label}`} onClick={onClose}>
          <X />
        </button>
      )}
    </span>
  );
}

import { X } from '@phosphor-icons/react';
import { NavButton } from '@ui/components/button/nav-button/nav-button';
import { ButtonVariant } from '@ui/components/button/regular-button/types';

import styles from './action-buttons.module.css';

import { Button } from '../../button/regular-button/button';
import type { SnackbarTone } from '../types';

const BUTTON_VARIANT_BY_TONE: Record<SnackbarTone, ButtonVariant> = {
  default: 'primary',
  critical: 'critical',
  info: 'primary',
  warning: 'secondary',
  success: 'success',
};

type ActionButtonsProps = {
  tone: SnackbarTone;
  buttonLabel?: string;
  onButtonClick?: () => void;
  onClose?: () => void;
};

export function ActionButtons({ tone, buttonLabel, onButtonClick, onClose }: ActionButtonsProps) {
  const buttonType = BUTTON_VARIANT_BY_TONE[tone] ?? 'primary';

  return (
    <div className={styles['container']}>
      {buttonLabel && onButtonClick && (
        <Button variant={buttonType} onClick={onButtonClick}>
          {buttonLabel}
        </Button>
      )}
      {onClose && <NavButton aria-label="Close" size="s" variant="plain" onClick={onClose} prefixIcon={<X />} />}
    </div>
  );
}

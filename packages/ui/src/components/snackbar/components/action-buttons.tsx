import { X } from '@phosphor-icons/react';
import { NavButton } from '@ui/components/button/nav-button/nav-button';
import { ButtonVariant } from '@ui/components/button/regular-button/types';

import styles from './action-buttons.module.css';

import { Button } from '../../button/regular-button/button';
import { SnackbarType } from '../types';

type ActionButtonsProps = {
  variant: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
  onClose?: () => void;
};

export function ActionButtons({ variant, buttonLabel, onButtonClick, onClose }: ActionButtonsProps) {
  const buttonTypeMap: Record<string, ButtonVariant> = {
    [SnackbarType.DEFAULT]: 'primary',
    [SnackbarType.ERROR]: 'critical',
    [SnackbarType.INFO]: 'primary',
    [SnackbarType.WARNING]: 'secondary',
    [SnackbarType.SUCCESS]: 'success',
  };

  const buttonType = buttonTypeMap[variant] || 'primary';

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

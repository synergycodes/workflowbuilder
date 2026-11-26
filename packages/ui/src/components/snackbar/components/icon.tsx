import infoIcon from '@iconify-icons/ph/info';
import { Icon as IconGlyph } from '@ui/components/icon';
import { WithIcon } from '@ui/shared/types/with-icon';
import { clsx } from 'clsx';

import styles from './icon.module.css';

import { SnackbarVariant } from '../types';

type IconProps = WithIcon & {
  isCentered: boolean;
  variant: SnackbarVariant;
};

export function Icon({ icon, isCentered, variant }: IconProps) {
  return (
    <div
      className={clsx(styles['container'], {
        [styles['center']]: isCentered,
      })}
    >
      {icon ?? <IconGlyph icon={infoIcon} className={clsx(styles['status'], styles[variant])} />}
    </div>
  );
}

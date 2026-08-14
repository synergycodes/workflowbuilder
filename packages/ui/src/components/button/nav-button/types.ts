import { Size } from '@ui/shared/types/size';

import { BaseButtonProps } from '../types';

export type NavBaseButtonProps = BaseButtonProps & {
  /**
   * Size variant of the nav button.
   * @default 'medium'
   */
  size?: Size;
  isSelected?: boolean;
};

export type { NavIconButtonProps } from './nav-icon-button/nav-icon-button';
export type { NavIconLabelButtonProps } from './nav-icon-label-button/nav-icon-label-button';
export type { NavLabelButtonProps } from './nav-label-button/nav-label-button';

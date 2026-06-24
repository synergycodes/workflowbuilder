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

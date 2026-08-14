import { Size } from '@ui/shared/types/size';

import { BaseButtonProps } from '../types';

export type NavBaseButtonProps = BaseButtonProps & {
  size?: Size;
  isSelected?: boolean;
};

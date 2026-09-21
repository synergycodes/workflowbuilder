import { WithIcon } from '../../shared/types/with-icon';

export type ListItem = Partial<WithIcon> & {
  type?: 'item' | 'separator';
  label?: string;
  disabled?: boolean;
};

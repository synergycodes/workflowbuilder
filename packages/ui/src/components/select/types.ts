import { ListItem } from '../../shared/types/list-item';

export type SelectItem = ListItem & {
  value?: string | number | null;
  label?: string;
};

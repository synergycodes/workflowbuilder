import { WithIcon } from '../../shared/types/with-icon';

/**
 * Fields shared by the rows of a `Menu` or `Select` list.
 *
 * @category Shared
 */
export type ListItem = Partial<WithIcon> & {
  /** `separator` renders a divider instead of a row. */
  type?: 'item' | 'separator';
  label?: string;
  disabled?: boolean;
};

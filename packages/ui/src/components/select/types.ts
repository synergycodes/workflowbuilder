import { ListItem } from '../../shared/types/list-item';

/**
 * One option of a `Select`'s `items`.
 *
 * @category Select
 */
export type SelectItem = ListItem & {
  /** Value the `Select` reports when this option is chosen. */
  value?: string | number | null;
  /** Text of the option. */
  label?: string;
};

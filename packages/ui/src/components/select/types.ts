import { ListItem } from '../../shared/types/list-item';

/**
 * Value of a `Select`. `null` means nothing is selected.
 *
 * @category Select
 */
export type SelectValueType = string | number | null;

/**
 * One option of a `Select`'s `items`.
 *
 * @category Select
 */
export type SelectItem = ListItem & {
  /** Value the `Select` reports when this option is chosen. */
  value?: SelectValueType;
  label?: string;
};

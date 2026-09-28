import { Size } from '@ui/shared/types/size';

/**
 * Size of a selection control (`Checkbox`, `Radio`, `Switch`): a subset of `Size`.
 *
 * @category Shared
 */
export type SelectorSize = Extract<Size, 'medium' | 'small' | 'extra-small'>;

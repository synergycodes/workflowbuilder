import { Size } from '@ui/shared/types/size';

/**
 * Size of a selection control (`Checkbox`, `Radio`, `Switch`).
 *
 * @category Shared
 */
export type SelectorSize = Extract<Size, 'medium' | 'small' | 'extra-small'>;

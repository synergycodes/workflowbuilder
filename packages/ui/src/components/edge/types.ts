import { SIZES, Size } from '../../shared/types/size';
import { rangeBetween } from '../../shared/utils/arrays';

export const EDGE_LABEL_SIZES = rangeBetween(SIZES, 'extra-small', 'medium');
export type EdgeLabelSize = Extract<Size, 'extra-small' | 'small' | 'medium'>;

export type EdgeState = 'default' | 'selected' | 'disabled' | 'temporary';

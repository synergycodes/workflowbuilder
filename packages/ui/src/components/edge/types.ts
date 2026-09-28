import { SIZES, Size } from '../../shared/types/size';
import { rangeBetween } from '../../shared/utils/arrays';

export const EDGE_LABEL_SIZES = rangeBetween(SIZES, 'extra-small', 'medium');
/**
 * Size of an edge label: a subset of `Size`.
 *
 * @category Edge
 */
export type EdgeLabelSize = Extract<Size, 'extra-small' | 'small' | 'medium'>;

/**
 * State an edge is drawn in. `temporary` marks an edge that is not part of the diagram yet, such as one being drawn.
 *
 * @category Edge
 */
export type EdgeState = 'default' | 'selected' | 'disabled' | 'temporary';

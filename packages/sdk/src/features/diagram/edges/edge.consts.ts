/**
 * Pixel gap between an edge endpoint and the connected node's bounding
 * box. Tunes the smooth-step routing used by {@link LabelEdge}.
 *
 * @category Constants
 */
export const EDGE_OFFSET = 20;

/**
 * Corner radius (px) used at every bend of a smooth-step edge.
 *
 * @category Constants
 */
export const EDGE_CURVE_RADIUS = 16;

/**
 * Vertical distance (px) between the source node's top edge and the
 * apex of a self-connecting edge's loop. Also drives where the edge's
 * label sits on a self-connecting edge.
 *
 * @category Constants
 */
export const SELF_CONNECTING_EDGE_LABEL_OFFSET = 100;

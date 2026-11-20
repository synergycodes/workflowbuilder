import { SIZES, Size } from '../../shared/types/size';
import { rangeBetween } from '../../shared/utils/arrays';

export const EDGE_LABEL_SIZES = rangeBetween(SIZES, 'extra-small', 'medium');
/**
 * Size of an edge label.
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

/**
 * Where an edge stands in an execution run. A run state overrides hover and selection colours with a tone
 * ({@link EdgeRunTone}); `running` also animates the dash.
 *
 * @category Edge
 */
export type EdgeRunState = 'pending' | 'running' | 'completed' | 'outOfRun';

/**
 * Built-in edge run tones, one per DS `edge.stroke-*` status token. The list may grow in a minor release.
 *
 * @category Edge
 */
export const EDGE_RUN_TONES = ['default', 'active', 'success', 'warning', 'disabled'] as const;

/**
 * Colour of an edge under a run state, read from `--wb-public-edge-run-status-stroke-<tone>`.
 *
 * @category Edge
 */
export type EdgeRunTone = (typeof EDGE_RUN_TONES)[number];

/**
 * A built-in {@link EdgeRunTone} or the name of a custom one, which reads `--wb-public-edge-run-status-stroke-<name>`.
 * A variable the application does not define, or a name outside `[a-z0-9-]`, falls back to the run state's own tone.
 *
 * @category Edge
 */
export type EdgeRunToneName = EdgeRunTone | (string & {});

/**
 * Line pattern of an edge outside a running state.
 *
 * @category Edge
 */
export type EdgeLineType = 'solid' | 'dashed';

/**
 * Terminator drawn where an edge reaches its target.
 *
 * @category Edge
 */
export type EdgeEndpoint = 'arrow' | 'circle' | 'none';

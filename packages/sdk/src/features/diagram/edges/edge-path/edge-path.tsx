import {
  type EdgeEndpoint,
  type EdgeLineType,
  type EdgeRunState,
  type EdgeState,
  useEdgeStyle,
} from '@workflowbuilder/ui';

import { EnhancedBaseEdge } from '../enhanced-base-edge/enhanced-base-edge';

/**
 * Props of {@link EdgePath} and of the `'OptionalEdgePath'` slot. `source`,
 * `target` and `sourceHandle` are not drawn; they let a decorator look up the
 * run state of the edge's nodes. `runState`, `lineType` and `endpoint` come
 * from the app.
 *
 * @category Components
 */
export type EdgePathProps = {
  edgeId: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  path: string;
  state?: EdgeState;
  hovered?: boolean;
  runState?: EdgeRunState;
  lineType?: EdgeLineType;
  /** Terminator at the target end, `arrow` by default. */
  endpoint?: EdgeEndpoint;
};

/**
 * Draws one edge path with the design-system look, through `useEdgeStyle` and
 * {@link EnhancedBaseEdge}, ending in an arrow at the target. `runState`,
 * `lineType` and `endpoint` come from the app: render {@link OptionalEdgePath}
 * instead to let a plugin set them.
 *
 * @category Components
 */
export function EdgePath({ edgeId, path, state, hovered, runState, lineType, endpoint = 'arrow' }: EdgePathProps) {
  const style = useEdgeStyle({ state, isHovered: hovered, runState, lineType });

  return <EnhancedBaseEdge id={edgeId} path={path} style={style} endpoint={endpoint} data-run-state={runState} />;
}

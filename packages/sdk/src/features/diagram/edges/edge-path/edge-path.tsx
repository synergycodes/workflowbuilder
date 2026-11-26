import {
  type EdgeEndpoint,
  type EdgeLineType,
  type EdgeRunState,
  type EdgeRunToneName,
  type EdgeState,
  useEdgeStyle,
} from '@workflowbuilder/ui';
import { useContext } from 'react';

import { EdgeEndpointContext } from '../edge-endpoint-context';
import { EnhancedBaseEdge } from '../enhanced-base-edge/enhanced-base-edge';

/**
 * Props of {@link EdgePath} and of the `'OptionalEdgePath'` slot. `source`,
 * `target` and `sourceHandle` are not drawn; they let a decorator look up the
 * run state of the edge's nodes. `runState`, `tone`, `lineType` and `endpoint`
 * come from the app.
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
  /** Colour under `runState`, replacing its default tone. Ignored without `runState`. */
  tone?: EdgeRunToneName;
  lineType?: EdgeLineType;
  /** Terminator at the target end. Defaults to `edgeEndpoint` of `<WorkflowBuilder.Root>`. */
  endpoint?: EdgeEndpoint;
};

/**
 * Draws one edge path with the design-system look, through `useEdgeStyle` and
 * {@link EnhancedBaseEdge}. `runState`, `tone`, `lineType` and `endpoint` come
 * from the app: render {@link OptionalEdgePath} instead to let a plugin set them.
 *
 * @category Components
 */
export function EdgePath({ edgeId, path, state, hovered, runState, tone, lineType, endpoint }: EdgePathProps) {
  const style = useEdgeStyle({ state, hovered, runState, tone, lineType });
  const rootEndpoint = useContext(EdgeEndpointContext);

  return (
    <EnhancedBaseEdge
      id={edgeId}
      path={path}
      style={style}
      endpoint={endpoint ?? rootEndpoint}
      data-run-state={runState}
    />
  );
}

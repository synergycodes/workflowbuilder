import { type EdgeEndpoint, EdgeEndpointMarker } from '@workflowbuilder/ui';
import { BaseEdge, type BaseEdgeProps } from '@xyflow/react';
import clsx from 'clsx';
import { useId } from 'react';

import styles from './enhanced-base-edge.module.css';

type EnhancedBaseEdgeProps = BaseEdgeProps & {
  /**
   * Design-system terminator at the target end, in the colour of `style`;
   * `none` by default. Replaces `markerEnd` when set.
   */
  endpoint?: EdgeEndpoint;
};

/**
 * Drop-in replacement for xyflow's `<BaseEdge>` that paints a transparent
 * thicker stroke underneath the visible path. The transparent overlay
 * widens the edge's hover / click target without altering its visual
 * appearance — useful for thin edges that would otherwise be hard to grab.
 * `--wb-public-edge-hit-width` (default `12`) sets its width.
 *
 * Use it inside a custom edge component the same way you'd use `BaseEdge`.
 * Pass `endpoint` to end the path with the design-system arrow or circle.
 *
 * @category Components
 */
export function EnhancedBaseEdge({ id, path, endpoint = 'none', ...rest }: EnhancedBaseEdgeProps) {
  const markerId = useId();
  const hasEndpoint = endpoint !== 'none';
  // Without a stroke the line takes xyflow's grey, which the marker cannot read.
  const style =
    hasEndpoint && rest.style?.stroke === undefined
      ? { stroke: 'var(--wb-public-edge-color)', strokeWidth: 'var(--wb-public-edge-stroke-width)', ...rest.style }
      : rest.style;

  return (
    <>
      {/* interactionWidth 0: xyflow's own 20 px path would catch the pointer through `visibleStroke`. */}
      <BaseEdge
        data-path-border-for={id}
        className={styles['clickable-transparent-border']}
        path={path}
        interactionWidth={0}
      />
      {/* One marker per edge: an xyflow `markerEnd` is shared and keeps one colour, so it cannot follow the state. */}
      {hasEndpoint && <EdgeEndpointMarker id={markerId} type={endpoint} style={style} />}
      <BaseEdge
        id={id}
        data-edge-id={id}
        path={path}
        interactionWidth={0}
        {...rest}
        className={clsx(styles['line'], rest.className)}
        style={style}
        markerEnd={hasEndpoint ? `url(#${markerId})` : rest.markerEnd}
      />
    </>
  );
}

import { BaseEdge, type BaseEdgeProps } from '@xyflow/react';

import styles from './enhanced-base-edge.module.css';

type EnhancedBaseEdgeProps = BaseEdgeProps;

/**
 * Drop-in replacement for xyflow's `<BaseEdge>` that paints a transparent
 * thicker stroke underneath the visible path. The transparent overlay
 * widens the edge's hover / click target without altering its visual
 * appearance — useful for thin edges that would otherwise be hard to grab.
 * `--wb-public-edge-hit-width` (default `12`) sets its width.
 *
 * Use it inside a custom edge component the same way you'd use `BaseEdge`.
 *
 * @category Components
 */
export function EnhancedBaseEdge({ id, path, ...rest }: EnhancedBaseEdgeProps) {
  return (
    <>
      {/* interactionWidth 0: xyflow's own 20 px path would catch the pointer through `visibleStroke`. */}
      <BaseEdge
        data-path-border-for={id}
        className={styles['clickable-transparent-border']}
        path={path}
        interactionWidth={0}
      />
      <BaseEdge id={id} data-edge-id={id} path={path} interactionWidth={0} {...rest} />
    </>
  );
}

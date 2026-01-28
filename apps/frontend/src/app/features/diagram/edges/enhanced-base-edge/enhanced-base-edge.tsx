import { BaseEdge, BaseEdgeProps } from '@xyflow/react';

import styles from './enhanced-base-edge.module.css';

type EnhancedBaseEdgeProps = BaseEdgeProps;

export function EnhancedBaseEdge({ id, path, ...rest }: EnhancedBaseEdgeProps) {
  return (
    <>
      <BaseEdge data-path-border-for={id} className={styles['clickable-transparent-border']} path={path} />
      <BaseEdge id={id} data-edge-id={id} path={path} {...rest} />;
    </>
  );
}

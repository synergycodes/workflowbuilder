import { getStoreEdges, setStoreEdges, useStore } from '@workflowbuilder/sdk';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { useEffect } from 'react';

import styles from './error-handle.module.css';

type Props = {
  props?: {
    nodeId: string;
  };
};

// Source handle (id 'errorRoute') that materialises the runner's
// `errorPolicy: 'errorRoute'` contract on the canvas — edges with
// `sourceHandle === 'errorRoute'` only fire when the upstream node fails
// with that policy. The handle is therefore rendered only for nodes
// that opted into routing; 'fail'/'continue' nodes have no use for it.
export function ErrorHandle({ props }: Props) {
  const nodeId = props?.nodeId ?? '';
  const errorPolicy = useStore((s) => s.nodes.find((node) => node.id === nodeId)?.data.properties?.errorPolicy);
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    if (nodeId) updateNodeInternals(nodeId);
  }, [errorPolicy, nodeId, updateNodeInternals]);

  useEffect(() => {
    if (!nodeId || errorPolicy === 'errorRoute') return;
    const edges = getStoreEdges();
    const remaining = edges.filter((edge) => !(edge.source === nodeId && edge.sourceHandle === 'errorRoute'));
    if (remaining.length !== edges.length) {
      setStoreEdges(remaining);
    }
  }, [errorPolicy, nodeId]);

  if (errorPolicy !== 'errorRoute') return null;

  return <Handle id="errorRoute" type="source" position={Position.Bottom} className={styles['error-handle']} />;
}

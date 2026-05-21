import { type EdgeProps, getSmoothStepPath, useReactFlow } from '@xyflow/react';

import { Icon } from '@workflow-builder/icons';

import './variables.css';

import type { WorkflowBuilderEdge } from '../../../../node/node-data';
import { EdgeLabel } from '../edge-label-renderer/edge-label-renderer';
import { EDGE_CURVE_RADIUS, EDGE_OFFSET, SELF_CONNECTING_EDGE_LABEL_OFFSET } from '../edge.consts';
import { EnhancedBaseEdge } from '../enhanced-base-edge/enhanced-base-edge';
import { SelfConnectingEdge } from '../self-connecting-edge/self-connecting-edge';
import { useLabelEdgeHover } from './use-label-edge-hover';

/**
 * Default edge component for the diagram. Renders a smooth-step path
 * between two nodes, mounts an {@link EdgeLabel} at the midpoint when
 * `data.label` or `data.icon` is set, and degrades to a self-connecting
 * loop when source and target are the same node.
 *
 * Registered automatically as the `'labelEdge'` type — to use it in your
 * own diagrams, set `edge.type = 'labelEdge'` and put a label / icon in
 * `edge.data`.
 *
 * @category Components
 */
export function LabelEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data = {},
  selected,
  source,
  target,
}: EdgeProps<WorkflowBuilderEdge>) {
  const { getNode } = useReactFlow();
  const { style, hovered, onMouseEnter, onMouseLeave } = useLabelEdgeHover({
    id,
    isSelected: selected,
  });

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: EDGE_CURVE_RADIUS,
    offset: EDGE_OFFSET,
  });

  const { label, icon } = data;
  const content = icon ? <Icon name={icon} /> : label;

  const labelProps = {
    id,
    content,
    hovered,
    selected,
    icon,
    onMouseEnter,
    onMouseLeave,
  };

  if (source === target) {
    const sourceNode = getNode(source);
    const nodeHeight = sourceNode?.height ?? 0;
    const selfConnectingLabelY = sourceY - (nodeHeight + SELF_CONNECTING_EDGE_LABEL_OFFSET);

    return (
      <>
        <SelfConnectingEdge
          id={id}
          sourceX={sourceX}
          sourceY={sourceY}
          targetX={targetX}
          targetY={targetY}
          selected={selected}
          hovered={hovered}
          source={source}
          target={target}
          sourcePosition={sourcePosition}
          targetPosition={targetPosition}
        />
        <EdgeLabel {...labelProps} labelX={labelX} labelY={selfConnectingLabelY} />
      </>
    );
  }

  return (
    <>
      <EnhancedBaseEdge id={id} path={edgePath} style={style} />
      <EdgeLabel {...labelProps} labelX={labelX} labelY={labelY} />
    </>
  );
}

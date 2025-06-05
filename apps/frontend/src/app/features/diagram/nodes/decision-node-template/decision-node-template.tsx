import { IconType } from '@workflow-builder/types/common';
import { LayoutDirection } from '@workflow-builder/types/common';
import { memo, useMemo } from 'react';
import { NodeDescription, NodeIcon, NodePanel, Status } from '@synergycodes/axiom';
import { Icon } from '@workflow-builder/icons';
import { BranchesContainer } from './components/branches-container';
import { DecisionBranch } from '@/features/json-form/types/controls';

import styles from './decision-node-template.module.css';
import { Handle, Position } from '@xyflow/react';
import { getHandleId } from '../../handles/get-handle-id';

type Props = {
  id: string;
  icon: IconType;
  label: string;
  description: string;
  selected?: boolean;
  layoutDirection?: LayoutDirection;
  isConnecting?: boolean;
  showHandles?: boolean;
  isValid?: boolean;
  decisionBranches?: DecisionBranch[];
};

export const DecisionNodeTemplate = memo(
  ({
    id,
    icon,
    label,
    description,
    showHandles,
    selected = false,
    isValid,
    decisionBranches,
    layoutDirection,
  }: Props) => {
    const iconElement = useMemo(() => <Icon name={icon} size="large" />, [icon]);

    const handleTargetId = getHandleId({ nodeId: id, handleType: 'target' });
    const handleSourceId = getHandleId({ nodeId: id, handleType: 'source' });

    const isCanvasNode = showHandles;

    return (
      <NodePanel.Root selected={selected} className={styles['decision-node']}>
        <NodePanel.Header>
          <Status status={isValid === false ? 'invalid' : undefined} />
          <NodeIcon icon={iconElement} />
          <NodeDescription label={label} description={description} />
        </NodePanel.Header>
        <NodePanel.Content isVisible={isCanvasNode}>
          <BranchesContainer layoutDirection={layoutDirection} nodeId={id} decisionBranches={decisionBranches ?? []} />
        </NodePanel.Content>
        <NodePanel.Handles isVisible={isCanvasNode} alignment="header">
          <Handle id={handleTargetId} position={Position.Left} type="target" />
          <Handle id={handleSourceId} position={Position.Right} type="source" />
        </NodePanel.Handles>
      </NodePanel.Root>
    );
  },
);

import { NodeDescription, NodeIcon, NodePanel, Status } from '@synergycodes/overflow-ui';
import { Handle } from '@xyflow/react';
import { memo, useMemo } from 'react';

import { Icon } from '@workflow-builder/icons';

import styles from './decision-node-template.module.css';

import type { IconType } from '../../../../node/common';
import type { LayoutDirection } from '../../../../node/common';
import type { DecisionBranch } from '../../../json-form/types/controls';
import { OptionalNodeContent } from '../../../plugins-core/components/diagram/optional-node-content';
import { getHandleId } from '../../handles/get-handle-id';
import { getHandlePosition } from '../../handles/get-handle-position';
import { BranchesContainer } from './components/branches-container';

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
  onAddBranch?: () => void;
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
    layoutDirection = 'RIGHT',
    onAddBranch,
  }: Props) => {
    const iconElement = useMemo(() => <Icon name={icon} size="large" />, [icon]);

    const handleTargetId = getHandleId({ nodeId: id, handleType: 'target' });
    const handleSourceId = getHandleId({ nodeId: id, handleType: 'source' });

    const handleTargetPosition = getHandlePosition({ direction: layoutDirection, handleType: 'target' });
    const handleSourcePosition = getHandlePosition({ direction: layoutDirection, handleType: 'source' });

    const isCanvasNode = showHandles;

    const handlesAlignment = layoutDirection === 'RIGHT' ? 'header' : 'center';

    return (
      <NodePanel.Root selected={selected} className={styles['decision-node']}>
        <NodePanel.Header>
          <NodeIcon icon={iconElement} />
          <NodeDescription label={label} description={description} />
        </NodePanel.Header>
        <NodePanel.Content isVisible={isCanvasNode}>
          <OptionalNodeContent nodeId={id}>
            <Status status={isValid === false ? 'invalid' : undefined} />
            <BranchesContainer
              layoutDirection={layoutDirection}
              decisionBranches={decisionBranches ?? []}
              onAddBranch={onAddBranch}
            />
          </OptionalNodeContent>
        </NodePanel.Content>
        <NodePanel.Handles isVisible={isCanvasNode} alignment={handlesAlignment}>
          <Handle id={handleTargetId} position={handleTargetPosition} type="target" />
          <Handle id={handleSourceId} position={handleSourcePosition} type="source" />
        </NodePanel.Handles>
      </NodePanel.Root>
    );
  },
);

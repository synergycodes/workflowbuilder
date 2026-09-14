import { NodeDescription, NodeIcon, NodePanel, Status } from '@workflowbuilder/ui';
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
import { getHandlesAlignment } from '../../handles/get-handles-alignment';
import { BranchesContainer } from './components/branches-container';

type Props = {
  id: string;
  icon: IconType;
  label: string;
  description: string;
  selected?: boolean;
  /** Render the Node Disabled variant (palette entries that cannot be added). */
  disabled?: boolean;
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
    disabled = false,
    isValid,
    decisionBranches,
    layoutDirection = 'RIGHT',
    onAddBranch,
  }: Props) => {
    const iconElement = useMemo(() => <Icon name={icon} size="large" />, [icon]);

    const handleTargetId = getHandleId({ handleType: 'target' });
    const handleTargetPosition = getHandlePosition({ direction: layoutDirection, handleType: 'target' });

    const isCanvasNode = showHandles;

    const handlesAlignment = getHandlesAlignment({ layoutDirection });

    return (
      <NodePanel.Root selected={selected} disabled={disabled} className={styles['decision-node']}>
        <NodePanel.Header>
          <NodeIcon icon={iconElement} disabled={disabled} />
          <NodeDescription label={label} description={description} disabled={disabled} />
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
        </NodePanel.Handles>
      </NodePanel.Root>
    );
  },
);

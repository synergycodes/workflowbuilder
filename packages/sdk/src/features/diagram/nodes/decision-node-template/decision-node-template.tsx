import { NodeDescription, NodeIcon, NodePanel } from '@workflowbuilder/ui';
import { Handle } from '@xyflow/react';
import clsx from 'clsx';
import { memo, useMemo } from 'react';

import { Icon } from '@workflow-builder/icons';

import styles from './decision-node-template.module.css';

import type { IconType, NodeIconAccent } from '../../../../node/common';
import type { LayoutDirection } from '../../../../node/common';
import type { DecisionBranch } from '../../../json-form/types/controls';
import { OptionalNodeContent } from '../../../plugins-core/components/diagram/optional-node-content';
import {
  NodeOverlaySlots,
  OptionalNodeFooter,
  OptionalNodeHeaderEnd,
} from '../../../plugins-core/components/diagram/optional-node-run-status-slots';
import { getHandleId } from '../../handles/get-handle-id';
import { getHandlePosition } from '../../handles/get-handle-position';
import { getHandlesAlignment } from '../../handles/get-handles-alignment';
import { BranchesContainer } from './components/branches-container';

type Props = {
  id: string;
  icon: IconType;
  accent?: NodeIconAccent;
  label: string;
  description: string;
  selected?: boolean;
  /** Render the Node Disabled variant (palette entries that cannot be added). */
  disabled?: boolean;
  layoutDirection?: LayoutDirection;
  showHandles?: boolean;
  isValid?: boolean;
  decisionBranches?: DecisionBranch[];
  isAddDisabled?: boolean;
  onAddBranch?: () => void;
};

export const DecisionNodeTemplate = memo(
  ({
    id,
    icon,
    accent,
    label,
    description,
    showHandles,
    selected = false,
    disabled = false,
    isValid,
    decisionBranches,
    layoutDirection = 'RIGHT',
    isAddDisabled = false,
    onAddBranch,
  }: Props) => {
    const iconElement = useMemo(() => <Icon name={icon} size="inherit" />, [icon]);

    const handleTargetId = getHandleId({ handleType: 'target' });
    const handleTargetPosition = getHandlePosition({ direction: layoutDirection, handleType: 'target' });

    const isCanvasNode = showHandles;

    const handlesAlignment = getHandlesAlignment({ layoutDirection });

    return (
      <NodePanel.Root
        selected={selected}
        disabled={disabled}
        className={clsx(styles['decision-node'], { [styles['decision-node--down']]: layoutDirection === 'DOWN' })}
      >
        <NodePanel.Header>
          <NodeIcon icon={iconElement} accent={accent} disabled={disabled} />
          <NodeDescription label={label} description={description} disabled={disabled} />
          {isCanvasNode && <OptionalNodeHeaderEnd nodeId={id} />}
        </NodePanel.Header>
        <NodePanel.Content visible={isCanvasNode}>
          <OptionalNodeContent nodeId={id}>
            <BranchesContainer
              layoutDirection={layoutDirection}
              decisionBranches={decisionBranches ?? []}
              isAddDisabled={isAddDisabled}
              onAddBranch={onAddBranch}
            />
          </OptionalNodeContent>
        </NodePanel.Content>
        <NodePanel.Footer visible={isCanvasNode}>
          <OptionalNodeFooter nodeId={id} />
        </NodePanel.Footer>
        <NodePanel.Overlay visible={isCanvasNode}>
          <NodeOverlaySlots nodeId={id} isValid={isValid} />
        </NodePanel.Overlay>
        <NodePanel.Handles visible={isCanvasNode} alignment={handlesAlignment}>
          <Handle id={handleTargetId} position={handleTargetPosition} type="target" />
        </NodePanel.Handles>
      </NodePanel.Root>
    );
  },
);

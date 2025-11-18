import { Handle } from '@xyflow/react';
import { IconType, LayoutDirection } from '@workflow-builder/types/common';
import { memo, useMemo } from 'react';
import { Collapsible, NodeDescription, NodeIcon, NodePanel, Status } from '@synergycodes/overflow-ui';
import { Icon } from '@workflow-builder/icons';
import { getHandleId } from '../../handles/get-handle-id';
import { getHandlePosition } from '../../handles/get-handle-position';

import styles from './workflow-node-template.module.css';
import { withOptionalComponentPlugins } from '@/features/plugins-core/adapters/adapter-components';
import { NodeData } from '@workflow-builder/types/node-data';

export type WorkflowNodeTemplateProps = {
  id: string;
  icon: IconType;
  label: string;
  description: string;
  data?: NodeData;
  selected?: boolean;
  layoutDirection?: LayoutDirection;
  isConnecting?: boolean;
  showHandles?: boolean;
  isValid?: boolean;
  children?: React.ReactNode;
};

const WorkflowNodeTemplateComponent = memo(
  ({
    id,
    icon,
    label,
    description,
    layoutDirection = 'RIGHT',
    selected = false,
    showHandles = true,
    isValid,
    children,
  }: WorkflowNodeTemplateProps) => {
    const handleTargetId = getHandleId({ nodeId: id, handleType: 'target' });
    const handleSourceId = getHandleId({ nodeId: id, handleType: 'source' });

    const handleTargetPosition = getHandlePosition({ direction: layoutDirection, handleType: 'target' });
    const handleSourcePosition = getHandlePosition({ direction: layoutDirection, handleType: 'source' });

    const iconElement = useMemo(() => <Icon name={icon} size="large" />, [icon]);

    const hasContent = !!children;

    const handlesAlignment = hasContent && layoutDirection === 'RIGHT' ? 'header' : 'center';

    return (
      <Collapsible>
        <NodePanel.Root selected={selected} className={styles['content']}>
          <NodePanel.Header>
            <NodeIcon icon={iconElement} />
            <NodeDescription label={label} description={description} />
            {hasContent && <Collapsible.Button />}
          </NodePanel.Header>
          <NodePanel.Content>
            <Status status={isValid === false ? 'invalid' : undefined} />
            <Collapsible.Content>
              <div className={styles['collapsible']}>{children}</div>
            </Collapsible.Content>
          </NodePanel.Content>
          <NodePanel.Handles isVisible={showHandles} alignment={handlesAlignment}>
            <Handle id={handleTargetId} position={handleTargetPosition} type="target" />
            <Handle id={handleSourceId} position={handleSourcePosition} type="source" />
          </NodePanel.Handles>
        </NodePanel.Root>
      </Collapsible>
    );
  },
);

export const WorkflowNodeTemplate = withOptionalComponentPlugins(WorkflowNodeTemplateComponent, 'WorkflowNodeTemplate');

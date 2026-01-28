import { Collapsible, NodeDescription, NodeIcon, NodePanel, Status } from '@synergycodes/overflow-ui';
import { Handle } from '@xyflow/react';
import { memo, useMemo } from 'react';

import { Icon } from '@workflow-builder/icons';
import { IconType, LayoutDirection } from '@workflow-builder/types/common';
import { NodeData } from '@workflow-builder/types/node-data';

import styles from './start-node-template.module.css';

import { withOptionalComponentPlugins } from '@/features/plugins-core/adapters/adapter-components';
import { OptionalNodeContent } from '@/features/plugins-core/components/diagram/optional-node-content';

import { getHandleId } from '../../handles/get-handle-id';
import { getHandlePosition } from '../../handles/get-handle-position';

type StartNodeTemplateProps = {
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

const StartNodeTemplateComponent = memo(
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
  }: StartNodeTemplateProps) => {
    const isCanvasNode = showHandles;

    const handleSourceId = getHandleId({ nodeId: id, handleType: 'source' });

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
          <NodePanel.Content isVisible={isCanvasNode}>
            <OptionalNodeContent nodeId={id}>
              <Status status={isValid === false ? 'invalid' : undefined} />
              <Collapsible.Content>
                <div className={styles['collapsible']}>{children}</div>
              </Collapsible.Content>
            </OptionalNodeContent>
          </NodePanel.Content>
          <NodePanel.Handles isVisible={showHandles} alignment={handlesAlignment}>
            <Handle id={handleSourceId} position={handleSourcePosition} type="source" />
          </NodePanel.Handles>
        </NodePanel.Root>
      </Collapsible>
    );
  },
);

export const StartNodeTemplate = withOptionalComponentPlugins(StartNodeTemplateComponent, 'StartNodeTemplate');

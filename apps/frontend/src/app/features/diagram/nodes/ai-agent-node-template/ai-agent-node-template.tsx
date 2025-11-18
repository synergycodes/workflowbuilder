import clsx from 'clsx';
import styles from './ai-agent-node-template.module.css';

import { Handle } from '@xyflow/react';
import { IconType, LayoutDirection } from '@workflow-builder/types/common';
import { memo, useMemo } from 'react';
import { Collapsible, NodeDescription, NodeIcon, NodePanel, Status } from '@synergycodes/overflow-ui';
import { Icon } from '@workflow-builder/icons';
import { SettingInfo } from './components/setting-info/setting-info';
import { ToolInfo } from './components/tool-info/tool-info';
import { ItemOption } from '@workflow-builder/types/node-schema';
import { NodeDataProperties } from '@/features/json-form/types/default-properties';
import { AiAgentNodeSchema } from '../../../../data/nodes/ai-agent/schema';
import { getHandleId } from '../../handles/get-handle-id';
import { ConnectableItem } from '../components/connectable-item/connectable-item';
import { getHandlePosition } from '../../handles/get-handle-position';

type Props = {
  id: string;
  icon: IconType;
  label: string;
  description: string;
  selected?: boolean;
  isConnecting?: boolean;
  showHandles?: boolean;
  chatModel?: ItemOption | undefined;
  memoryModel?: ItemOption | undefined;
  selectedTools?: NodeDataProperties<AiAgentNodeSchema>['tools'] | undefined;
  isValid?: boolean;
  layoutDirection?: LayoutDirection;
};

export const AiAgentNodeTemplate = memo(
  ({
    id,
    icon,
    label,
    description,
    selected = false,
    showHandles = true,
    chatModel,
    memoryModel,
    selectedTools,
    isValid,
    layoutDirection = 'RIGHT',
  }: Props) => {
    const isCanvasNode = showHandles;
    const handleTargetId = getHandleId({ nodeId: id, handleType: 'target' });
    const handleSourceId = getHandleId({ nodeId: id, handleType: 'source' });

    const handleTargetPosition = getHandlePosition({ direction: layoutDirection, handleType: 'target' });
    const handleSourcePosition = getHandlePosition({ direction: layoutDirection, handleType: 'source' });

    const iconElement = useMemo(() => <Icon name={icon} size="large" />, [icon]);

    const handlesAlignment = layoutDirection === 'RIGHT' ? 'header' : 'center';

    return (
      <Collapsible>
        <NodePanel.Root selected={selected}>
          <NodePanel.Header className={styles['header']}>
            <NodeIcon className={styles['icon']} icon={iconElement} />
            <NodeDescription label={label} description={description} />
            {isCanvasNode && <Collapsible.Button />}
          </NodePanel.Header>
          <NodePanel.Content className={styles['content']}>
            <Status status={isValid === false ? 'invalid' : undefined} />
            <Collapsible.Content>
              <div className={styles['collapsible-content']}>
                <SettingInfo
                  label="Chat Model"
                  actionLabel={chatModel ? chatModel.label : 'Add Chat'}
                  icon={chatModel?.icon}
                  className={clsx({ [styles['selected-model-icon']]: chatModel })}
                />
                <SettingInfo
                  label="Memory"
                  actionLabel={memoryModel ? memoryModel.label : 'Add Memory'}
                  icon={memoryModel?.icon}
                  className={clsx({ [styles['selected-memory-icon']]: memoryModel })}
                />
              </div>
            </Collapsible.Content>
            <ToolInfo>
              {selectedTools?.map((_, index) => (
                <ConnectableItem
                  key={index}
                  label={`Tool #${index + 1}`}
                  handleType="source"
                  innerId={index.toString()}
                  nodeId={id}
                  canHaveBottomHandle={false}
                />
              ))}
            </ToolInfo>
          </NodePanel.Content>
          <NodePanel.Handles isVisible={isCanvasNode} alignment={handlesAlignment}>
            <Handle id={handleTargetId} position={handleTargetPosition} type="target" />
            <Handle id={handleSourceId} position={handleSourcePosition} type="source" />
          </NodePanel.Handles>
        </NodePanel.Root>
      </Collapsible>
    );
  },
);

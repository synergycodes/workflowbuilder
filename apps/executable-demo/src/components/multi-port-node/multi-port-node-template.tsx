import {
  Icon,
  type NodeDataProperties,
  NodeSection,
  OptionalNodeContent,
  type WorkflowNodeTemplateProps,
  defineNodeTemplate,
  getHandleId,
} from '@workflowbuilder/sdk';
import { NodeDescription, NodeIcon, NodePanel } from '@workflowbuilder/ui';
import { Handle, Position } from '@xyflow/react';
import { memo, useMemo } from 'react';

import styles from './multi-port-node-template.module.css';

import type { MultiPortSchema } from '../../data/nodes';

type MultiPortProperties = NodeDataProperties<MultiPortSchema>;

const TARGET_PORTS = [
  { id: 'top', label: 'Top', position: Position.Top },
  { id: 'left', label: 'Left', position: Position.Left },
] as const;

const SOURCE_PORTS = [
  { id: 'right', label: 'Right', position: Position.Right },
  { id: 'bottom', label: 'Bottom', position: Position.Bottom },
] as const;

export const MultiPortNodeTemplate = defineNodeTemplate<MultiPortProperties>(
  memo(
    ({
      id,
      icon,
      label,
      description,
      selected = false,
      isValid,
      showHandles = true,
    }: WorkflowNodeTemplateProps<MultiPortProperties>) => {
      const iconElement = useMemo(() => <Icon name={icon} size="large" />, [icon]);

      return (
        <NodePanel.Root selected={selected} className={styles['node']}>
          <NodePanel.Header>
            <NodeIcon icon={iconElement} />
            <NodeDescription label={label} description={description} />
          </NodePanel.Header>
          <NodePanel.Content isVisible={showHandles}>
            <OptionalNodeContent nodeId={id}>
              <NodeSection label="Ports">
                <div className={styles['ports']}>
                  inputs: top · left
                  <br />
                  outputs: right · bottom
                </div>
              </NodeSection>
              {isValid === false && <span className={styles['invalid']}>Invalid configuration</span>}
            </OptionalNodeContent>
          </NodePanel.Content>
          <NodePanel.Handles isVisible={showHandles}>
            {TARGET_PORTS.map((port) => (
              <Handle
                key={port.id}
                id={getHandleId({ handleType: 'target', innerId: port.id })}
                type="target"
                position={port.position}
                aria-label={`${port.label} input`}
              />
            ))}
            {SOURCE_PORTS.map((port) => (
              <Handle
                key={port.id}
                id={getHandleId({ handleType: 'source', innerId: port.id })}
                type="source"
                position={port.position}
                aria-label={`${port.label} output`}
              />
            ))}
          </NodePanel.Handles>
        </NodePanel.Root>
      );
    },
  ),
);

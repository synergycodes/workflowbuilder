import { NodeDescription, NodeIcon, NodePanel } from '@synergycodes/overflow-ui';
import { Icon, defineNodeTemplate, getHandleId, statusOptions } from '@workflowbuilder/sdk';
import type { NodeDataProperties, WorkflowNodeTemplateProps } from '@workflowbuilder/sdk';
import { Handle, Position } from '@xyflow/react';
import clsx from 'clsx';
import { memo, useMemo } from 'react';

import styles from './multi-port-node-template.module.css';

import type { MultiPortNodeSchema } from '../../data/nodes/multi-port/schema';

type MultiPortProperties = NodeDataProperties<MultiPortNodeSchema>;

const statusClass: Record<string, string> = {
  [statusOptions.active.value]: styles['status-active'],
  [statusOptions.draft.value]: styles['status-draft'],
  [statusOptions.disabled.value]: styles['status-disabled'],
};

export const MultiPortNodeTemplate = defineNodeTemplate<MultiPortProperties>(
  memo(
    ({
      icon,
      label,
      description,
      selected = false,
      data,
      showHandles = true,
    }: WorkflowNodeTemplateProps<MultiPortProperties>) => {
      const status = data?.properties.status ?? statusOptions.active.value;

      const iconElement = useMemo(() => <Icon name={icon} size="large" />, [icon]);
      const barClassName = clsx(styles['status-bar'], statusClass[status] ?? styles['status-draft']);

      const handleTargetTopId = getHandleId({ handleType: 'target', innerId: 'top' });
      const handleTargetLeftId = getHandleId({ handleType: 'target', innerId: 'left' });
      const handleSourceBottomId = getHandleId({ handleType: 'source', innerId: 'bottom' });
      const handleSourceRightId = getHandleId({ handleType: 'source', innerId: 'right' });

      return (
        <div className={styles['wrapper']}>
          <div className={barClassName} />
          <NodePanel.Root selected={selected}>
            <NodePanel.Header>
              <NodeIcon icon={iconElement} />
              <NodeDescription label={label} description={description} />
            </NodePanel.Header>
            <NodePanel.Handles isVisible={showHandles}>
              <Handle id={handleTargetTopId} type="target" position={Position.Top} />
              <Handle id={handleTargetLeftId} type="target" position={Position.Left} />
              <Handle id={handleSourceBottomId} type="source" position={Position.Bottom} />
              <Handle id={handleSourceRightId} type="source" position={Position.Right} />
            </NodePanel.Handles>
          </NodePanel.Root>
        </div>
      );
    },
  ),
);

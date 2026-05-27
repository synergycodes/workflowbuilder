import { Collapsible, NodeDescription, NodeIcon, NodePanel, Status } from '@synergycodes/overflow-ui';
import { Handle } from '@xyflow/react';
import { memo, useMemo } from 'react';

import { Icon } from '@workflow-builder/icons';

import styles from './workflow-node-template.module.css';

import type { IconType, LayoutDirection } from '../../../../node/common';
import type { NodeData } from '../../../../node/node-data';
import type { BaseNodeProperties } from '../../../../node/node-schema';
import { withOptionalComponentPlugins } from '../../../plugins-core/adapters/adapter-components';
import { OptionalNodeContent } from '../../../plugins-core/components/diagram/optional-node-content';
import { getHandleId } from '../../handles/get-handle-id';
import { getHandlePosition } from '../../handles/get-handle-position';

/**
 * Props for the editor's default workflow-node template. A custom node
 * type wraps this template (or composes its parts) to render its body —
 * see [Add a custom node](/docs/guides/add-a-custom-node/) for the
 * full pattern.
 *
 * `id`, `icon`, `label`, `description` define the header. `selected` /
 * `isValid` drive visual state. `showHandles` toggles the connection
 * dots; `layoutDirection` controls which sides those dots sit on.
 * `children` are rendered inside a collapsible body section.
 *
 * Generic over `P` so consumer templates can narrow `data.properties` to
 * their schema's shape without casts:
 *
 * ```ts
 * type MyProps = WorkflowNodeTemplateProps<NodeDataProperties<MySchema>>;
 * ```
 *
 * Defaults to the wide `BaseNodeProperties & Record<string, unknown>` so
 * existing usages remain backward-compatible.
 *
 * @category Components
 */
export type WorkflowNodeTemplateProps<P = BaseNodeProperties & Record<string, unknown>> = {
  id: string;
  icon: IconType;
  label: string;
  description: string;
  data?: NodeData<P>;
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
    const isCanvasNode = showHandles;

    const handleTargetId = getHandleId({ handleType: 'target' });
    const handleSourceId = getHandleId({ handleType: 'source' });

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
          <NodePanel.Content isVisible={isCanvasNode}>
            <OptionalNodeContent nodeId={id}>
              <Status status={isValid === false ? 'invalid' : undefined} />
              <Collapsible.Content>
                <div className={styles['collapsible']}>{children}</div>
              </Collapsible.Content>
            </OptionalNodeContent>
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

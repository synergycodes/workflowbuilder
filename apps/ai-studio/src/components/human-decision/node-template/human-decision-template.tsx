import { Icon, NodeSection, OptionalNodeContent, defineNodeTemplate, getHandleId } from '@workflowbuilder/sdk';
import type { NodeDataProperties, WorkflowNodeTemplateProps } from '@workflowbuilder/sdk';
import { NodeDescription, NodeIcon, NodePanel, Status } from '@workflowbuilder/ui';
import { Handle, Position } from '@xyflow/react';
import clsx from 'clsx';
import { memo, useMemo } from 'react';

import styles from './human-decision-template.module.css';

import type { HumanDecisionSchema } from '../../../nodes/human-decision/schema';

type HumanDecisionProperties = NodeDataProperties<HumanDecisionSchema>;

type RoutedAction = { label: string; port: string };

// One handle per action with a port, so the port a decision routes on is written once, in the request.
function routedActions(decisionRequest: unknown): RoutedAction[] {
  const actions = (decisionRequest as { actions?: unknown } | undefined)?.actions;
  if (!Array.isArray(actions)) {
    return [];
  }
  return actions.flatMap((action: unknown) => {
    const { label, port } = (action ?? {}) as { label?: unknown; port?: unknown };
    if (typeof port !== 'string' || port.length === 0) {
      return [];
    }
    return [{ label: typeof label === 'string' ? label : port, port }];
  });
}

export const HumanDecisionNodeTemplate = defineNodeTemplate<HumanDecisionProperties>(
  memo(
    ({
      id,
      icon,
      label,
      description,
      data,
      selected = false,
      disabled = false,
      layoutDirection = 'RIGHT',
      showHandles = true,
      isValid,
    }: WorkflowNodeTemplateProps<HumanDecisionProperties>) => {
      const iconElement = useMemo(() => <Icon name={icon} size="large" />, [icon]);
      const decisionRequest = data?.properties.decisionRequest;
      const actions = useMemo(() => routedActions(decisionRequest), [decisionRequest]);

      const isHorizontal = layoutDirection === 'RIGHT';
      const isCanvasNode = showHandles;

      return (
        <NodePanel.Root selected={selected} disabled={disabled}>
          <NodePanel.Header>
            <NodeIcon icon={iconElement} disabled={disabled} />
            <NodeDescription label={label} description={description} disabled={disabled} />
          </NodePanel.Header>
          <NodePanel.Content isVisible={isCanvasNode}>
            <OptionalNodeContent nodeId={id}>
              <Status status={isValid === false ? 'invalid' : undefined} />
              {actions.length > 0 && (
                <NodeSection label="Decision">
                  <div className={clsx(styles['actions'], { [styles['actions--vertical']]: isHorizontal })}>
                    {actions.map(({ label: actionLabel, port }) => (
                      <div key={port} className={styles['action']}>
                        <span className={styles['action-label']}>{actionLabel}</span>
                        <Handle id={port} type="source" position={isHorizontal ? Position.Right : Position.Bottom} />
                      </div>
                    ))}
                  </div>
                </NodeSection>
              )}
            </OptionalNodeContent>
          </NodePanel.Content>
          <NodePanel.Handles isVisible={isCanvasNode} alignment={isHorizontal ? 'header' : 'center'}>
            <Handle
              id={getHandleId({ handleType: 'target' })}
              type="target"
              position={isHorizontal ? Position.Left : Position.Top}
            />
          </NodePanel.Handles>
        </NodePanel.Root>
      );
    },
  ),
);

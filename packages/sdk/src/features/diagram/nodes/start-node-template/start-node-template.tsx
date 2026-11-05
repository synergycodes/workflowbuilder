import { Collapsible, NodeDescription, NodeIcon, NodePanel } from '@workflowbuilder/ui';
import { Handle } from '@xyflow/react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@workflow-builder/icons';

import styles from './start-node-template.module.css';

import type { IconType, LayoutDirection, NodeIconAccent } from '../../../../node/common';
import type { NodeData } from '../../../../node/node-data';
import { withOptionalComponentPlugins } from '../../../plugins-core/adapters/adapter-components';
import { OptionalNodeContent } from '../../../plugins-core/components/diagram/optional-node-content';
import {
  NodeOverlaySlots,
  OptionalNodeHeaderEnd,
} from '../../../plugins-core/components/diagram/optional-node-run-status-slots';
import { getHandleId } from '../../handles/get-handle-id';
import { getHandlePosition } from '../../handles/get-handle-position';
import { getHandlesAlignment } from '../../handles/get-handles-alignment';

type StartNodeTemplateProps = {
  id: string;
  icon: IconType;
  accent?: NodeIconAccent;
  label: string;
  description: string;
  data?: NodeData;
  selected?: boolean;
  /** Render the Node Disabled variant (palette entries that cannot be added). */
  disabled?: boolean;
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
    accent,
    label,
    description,
    layoutDirection = 'RIGHT',
    selected = false,
    disabled = false,
    showHandles = true,
    isValid,
    children,
  }: StartNodeTemplateProps) => {
    const { t } = useTranslation();
    const isCanvasNode = showHandles;

    const handleSourceId = getHandleId({ handleType: 'source' });

    const handleSourcePosition = getHandlePosition({ direction: layoutDirection, handleType: 'source' });

    const iconElement = useMemo(() => <Icon name={icon} size="inherit" />, [icon]);

    const handlesAlignment = getHandlesAlignment({ layoutDirection });

    return (
      <Collapsible expandLabel={t('common.expand')} collapseLabel={t('common.collapse')}>
        <NodePanel.Root selected={selected} disabled={disabled}>
          <NodePanel.Header>
            <NodeIcon icon={iconElement} accent={accent} disabled={disabled} />
            <NodeDescription label={label} description={description} disabled={disabled} />
            {!!children && <Collapsible.Button />}
            {isCanvasNode && <OptionalNodeHeaderEnd nodeId={id} />}
          </NodePanel.Header>
          <NodePanel.Content isVisible={isCanvasNode} className={styles['content']}>
            <OptionalNodeContent nodeId={id}>
              <Collapsible.Content>
                <div className={styles['collapsible']}>{children}</div>
              </Collapsible.Content>
            </OptionalNodeContent>
          </NodePanel.Content>
          <NodePanel.Overlay isVisible={isCanvasNode}>
            <NodeOverlaySlots nodeId={id} isValid={isValid} />
          </NodePanel.Overlay>
          <NodePanel.Handles isVisible={showHandles} alignment={handlesAlignment}>
            <Handle id={handleSourceId} position={handleSourcePosition} type="source" />
          </NodePanel.Handles>
        </NodePanel.Root>
      </Collapsible>
    );
  },
);

export const StartNodeTemplate = withOptionalComponentPlugins(StartNodeTemplateComponent, 'StartNodeTemplate');

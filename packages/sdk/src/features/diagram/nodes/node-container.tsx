import { NodeAsPortWrapper } from '@workflowbuilder/ui';
import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';

import type { WorkflowBuilderNode } from '../../../node/node-data';
import { useStore } from '../../../store/store';
import { getIsValidFromProperties } from '../../../utils/validation/get-is-valid-from-properties';
import { getHandlePosition } from '../handles/get-handle-position';
import { WorkflowNodeTemplate } from './workflow-node-template/workflow-node-template';

type Props = NodeProps<WorkflowBuilderNode>;

export const NodeContainer = memo(({ id, data, selected }: Props) => {
  const { icon, properties } = data;
  const { label = '', description = '' } = properties;
  const isValid = getIsValidFromProperties(properties);

  const layoutDirection = useStore((store) => store.layoutDirection);
  const handleTargetPosition = getHandlePosition({ direction: layoutDirection, handleType: 'target' });
  const connectionBeingDragged = useStore((store) => store.connectionBeingDragged);

  return (
    <NodeAsPortWrapper isConnecting={!!connectionBeingDragged} targetPortPosition={handleTargetPosition}>
      <WorkflowNodeTemplate
        id={id}
        selected={selected}
        layoutDirection={layoutDirection}
        data={data}
        label={label}
        description={description}
        icon={icon}
        isValid={isValid}
      />
    </NodeAsPortWrapper>
  );
});

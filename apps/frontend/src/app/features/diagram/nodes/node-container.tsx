import useStore from '@/store/store';

import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { WorkflowBuilderNode } from '@workflow-builder/types/node-data';
import { WorkflowNodeTemplate } from './workflow-node-template/workflow-node-template';
import { NodeAsPortWrapper } from '@synergycodes/axiom';
import { getHandlePosition } from '../handles/get-handle-position';

type Props = NodeProps<WorkflowBuilderNode>;

export const NodeContainer = memo(({ id, data, selected }: Props) => {
  const { icon, properties } = data;
  const { label = '', description = '' } = properties;

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
      />
    </NodeAsPortWrapper>
  );
});

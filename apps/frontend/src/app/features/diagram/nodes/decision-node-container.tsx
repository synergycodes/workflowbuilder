import useStore from '@/store/store';

import { memo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { NodeAsPortWrapper } from '@synergycodes/overflow-ui';
import { DecisionNodeTemplate } from './decision-node-template/decision-node-template';
import { DecisionNodeSchema } from '../../../data/nodes/decision/schema';
import { NodeDataProperties } from '@/features/json-form/types/default-properties';
import { NodeData } from '@workflow-builder/types/node-data';
import { DecisionBranch } from '@/features/json-form/types/controls';
import { getHandlePosition } from '../handles/get-handle-position';
import { getIsValidFromProperties } from '@/utils/validation/get-is-valid-from-properties';

type Props = NodeProps<Node<NodeData<NodeDataProperties<DecisionNodeSchema>>>>;

export const DecisionNodeContainer = memo(({ id, data, selected }: Props) => {
  const { icon, properties } = data;
  const { label = '', description = '', decisionBranches } = properties;
  const isValid = getIsValidFromProperties(properties);

  const layoutDirection = useStore((store) => store.layoutDirection);
  const handleTargetPosition = getHandlePosition({ direction: layoutDirection, handleType: 'target' });
  const connectionBeingDragged = useStore((store) => store.connectionBeingDragged);

  return (
    <NodeAsPortWrapper isConnecting={!!connectionBeingDragged} targetPortPosition={handleTargetPosition}>
      <DecisionNodeTemplate
        id={id}
        selected={selected}
        layoutDirection={layoutDirection}
        label={label}
        description={description}
        showHandles={true}
        icon={icon}
        decisionBranches={decisionBranches as DecisionBranch[]}
        isValid={isValid}
      />
    </NodeAsPortWrapper>
  );
});

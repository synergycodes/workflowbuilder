import { NodeAsPortWrapper } from '@synergycodes/overflow-ui';
import type { Node, NodeProps } from '@xyflow/react';
import { memo } from 'react';

import type { NodeData } from '../../../node/node-data';
import { useStore } from '../../../store/store';
import { getIsValidFromProperties } from '../../../utils/validation/get-is-valid-from-properties';
import type { DecisionBranch } from '../../json-form/types/controls';
import { getHandlePosition } from '../handles/get-handle-position';
import { addBranchToNode } from './decision-node-template/add-branch-action';
import { DecisionNodeTemplate } from './decision-node-template/decision-node-template';

type DecisionNodeProperties = {
  label?: string;
  description?: string;
  status?: string;
  decisionBranches?: DecisionBranch[];
};

type Props = NodeProps<Node<NodeData<DecisionNodeProperties>>>;

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
        decisionBranches={decisionBranches}
        isValid={isValid}
        onAddBranch={() => addBranchToNode(id)}
      />
    </NodeAsPortWrapper>
  );
});

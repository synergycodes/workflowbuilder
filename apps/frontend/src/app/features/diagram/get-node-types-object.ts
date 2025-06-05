import { NodeType } from '@workflow-builder/types/node-types';
import { NodeContainer } from './nodes/node-container';
import { NodeTypes } from '@xyflow/react';
import { AiNodeContainer } from './nodes/ai-node-container';
import { DecisionNodeContainer } from './nodes/decision-node-container';

export function getNodeTypesObject(): NodeTypes {
  return {
    [NodeType.Node]: NodeContainer,
    [NodeType.AiNode]: AiNodeContainer,
    [NodeType.DecisionNode]: DecisionNodeContainer,
  };
}

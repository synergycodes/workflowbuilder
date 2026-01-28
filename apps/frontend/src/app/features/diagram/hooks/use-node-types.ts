import { NodeTypes } from '@xyflow/react';
import { useMemo } from 'react';

import { NodeType } from '@workflow-builder/types/node-types';

import { AiNodeContainer } from '../nodes/ai-node-container';
import { DecisionNodeContainer } from '../nodes/decision-node-container';
import { NodeContainer } from '../nodes/node-container';
import { StartContainer } from '../nodes/start-node-container';

export function useNodeTypes(): NodeTypes {
  const nodeTypes = useMemo(() => {
    return {
      [NodeType.Node]: NodeContainer,
      [NodeType.StartNode]: StartContainer,
      [NodeType.AiNode]: AiNodeContainer,
      [NodeType.DecisionNode]: DecisionNodeContainer,
    };
  }, []);

  return nodeTypes;
}

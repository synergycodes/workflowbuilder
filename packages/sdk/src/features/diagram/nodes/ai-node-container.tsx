import { NodeAsPortWrapper } from '@workflowbuilder/ui';
import { type Node, type NodeProps, Position } from '@xyflow/react';
import { memo, useMemo } from 'react';

import type { NodeData } from '../../../node/node-data';
import { useStore } from '../../../store/store';
import { getIsValidFromProperties } from '../../../utils/validation/get-is-valid-from-properties';
import { chatModelOptions, memoryOptions } from '../../json-form/controls/ai-tools-control/select-options';
import type { AiAgentTool } from '../../json-form/types/controls';
import { openAddToolModalForNode } from './ai-agent-node-template/add-tool-action';
import { AiAgentNodeTemplate } from './ai-agent-node-template/ai-agent-node-template';

type AiAgentNodeProperties = {
  label?: string;
  description?: string;
  status?: string;
  chatModel?: string;
  memory?: string;
  systemPrompt?: string;
  tools?: AiAgentTool[];
};

type Props = NodeProps<Node<NodeData<AiAgentNodeProperties>>>;

export const AiNodeContainer = memo(({ id, data, selected }: Props) => {
  const { icon, properties, type } = data;
  const { label = '', description = '', chatModel, memory } = properties;
  const isValid = getIsValidFromProperties(properties);

  const layoutDirection = useStore((store) => store.layoutDirection);
  const connectionBeingDragged = useStore((store) => store.connectionBeingDragged);
  const nodeDefinition = useStore((store) => store.getNodeDefinition(type));

  const selectedModelOption = useMemo(() => {
    if (!chatModel || !nodeDefinition) {
      return;
    }
    return Object.values(chatModelOptions).find((x) => x.value === chatModel);
  }, [chatModel, nodeDefinition]);

  const selectedMemoryOptions = useMemo(() => {
    if (!memory || !nodeDefinition) {
      return;
    }
    return Object.values(memoryOptions).find((x) => x.value === memory);
  }, [memory, nodeDefinition]);

  return (
    <NodeAsPortWrapper
      isConnecting={!!connectionBeingDragged}
      targetPortPosition={Position.Left}
      offset={{ x: 0, y: 145 }}
    >
      <AiAgentNodeTemplate
        id={id}
        selected={selected}
        label={label}
        description={description}
        icon={icon}
        chatModel={selectedModelOption}
        memoryModel={selectedMemoryOptions}
        selectedTools={data.properties.tools}
        layoutDirection={layoutDirection}
        isValid={isValid}
        onAddTool={() => openAddToolModalForNode(id)}
      />
    </NodeAsPortWrapper>
  );
});

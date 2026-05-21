import type { ComponentType } from 'react';

import { getCustomNodeTemplates } from '../../data/node-templates';
import { useTranslateIfPossible } from '../../hooks/use-translate-if-possible';
import type { PaletteItem } from '../../node/common';
import { NodeType } from '../../node/node-types';
import { useStore } from '../../store/store';
import { resolveReactFlowNodeType } from '../../utils/resolve-react-flow-node-type';
import { AiAgentNodeTemplate } from '../diagram/nodes/ai-agent-node-template/ai-agent-node-template';
import { DecisionNodeTemplate } from '../diagram/nodes/decision-node-template/decision-node-template';
import { StartNodeTemplate } from '../diagram/nodes/start-node-template/start-node-template';
import {
  WorkflowNodeTemplate,
  type WorkflowNodeTemplateProps,
} from '../diagram/nodes/workflow-node-template/workflow-node-template';

type NodeTemplateRegistry = Record<string, ComponentType<WorkflowNodeTemplateProps>>;

// Built-in templates registered against their NodeType discriminator.
// Custom templates win on key collision (the lookup in NodePreview checks
// custom first, then falls back here), matching the canvas-side behavior
// in useNodeTypes.
const BUILT_IN_TEMPLATES: NodeTemplateRegistry = {
  [NodeType.Node]: WorkflowNodeTemplate,
  [NodeType.AiNode]: AiAgentNodeTemplate,
  [NodeType.StartNode]: StartNodeTemplate,
  [NodeType.DecisionNode]: DecisionNodeTemplate,
};

type NodePreviewContainerProps = {
  type: string;
};

export function NodePreviewContainer({ type }: NodePreviewContainerProps) {
  const getNodeDefinition = useStore((state) => state.getNodeDefinition);

  const nodeDefinition = getNodeDefinition(type);
  if (!nodeDefinition) {
    return;
  }

  return <NodePreview nodeDefinition={nodeDefinition} />;
}

type NodePreviewProps = {
  nodeDefinition: PaletteItem;
};

function NodePreview({ nodeDefinition }: NodePreviewProps) {
  const { type, icon, label, description, templateType = NodeType.Node } = nodeDefinition;

  const translateIfPossible = useTranslateIfPossible();

  const nodeLabel = translateIfPossible(label) || label;
  const nodeDescription = translateIfPossible(description) || description;

  const custom = getCustomNodeTemplates();
  const templateKey = resolveReactFlowNodeType(type, templateType, custom);
  const TemplateComponent = custom[templateKey] ?? BUILT_IN_TEMPLATES[templateKey] ?? BUILT_IN_TEMPLATES[NodeType.Node];

  return <TemplateComponent icon={icon} label={nodeLabel} description={nodeDescription} showHandles={false} id={''} />;
}

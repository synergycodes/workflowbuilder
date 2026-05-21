import type { NodeProps, NodeTypes } from '@xyflow/react';
import { type ComponentType, memo, useMemo } from 'react';

import { getCustomNodeTemplates } from '../../../data/node-templates';
import type { WorkflowBuilderNode } from '../../../node/node-data';
import { NodeType } from '../../../node/node-types';
import { useStore } from '../../../store/store';
import { getIsValidFromProperties } from '../../../utils/validation/get-is-valid-from-properties';
import { AiNodeContainer } from '../nodes/ai-node-container';
import { DecisionNodeContainer } from '../nodes/decision-node-container';
import { NodeContainer } from '../nodes/node-container';
import { StartContainer } from '../nodes/start-node-container';
import type { WorkflowNodeTemplateProps } from '../nodes/workflow-node-template/workflow-node-template';

const BUILT_IN_KEYS: ReadonlySet<string> = new Set<string>([
  NodeType.Node,
  NodeType.StartNode,
  NodeType.AiNode,
  NodeType.DecisionNode,
]);

// Wraps a consumer's WorkflowNodeTemplateProps-shaped component so ReactFlow,
// which calls it with NodeProps<WorkflowBuilderNode>, can render it on the
// canvas. Mirrors the data extraction the built-in NodeContainer does for
// WorkflowNodeTemplate (id, header fields, data, selected, isValid,
// layoutDirection) minus NodeAsPortWrapper, which stays opt-in for consumers
// that need drag-to-create connections on the node body.
function adaptCustomNodeTemplate(Template: ComponentType<WorkflowNodeTemplateProps>) {
  const Adapter = memo(({ id, data, selected }: NodeProps<WorkflowBuilderNode>) => {
    const { icon, properties } = data;
    const { label = '', description = '' } = properties;
    const isValid = getIsValidFromProperties(properties);
    const layoutDirection = useStore((store) => store.layoutDirection);
    return (
      <Template
        id={id}
        icon={icon}
        label={label}
        description={description}
        data={data}
        selected={selected}
        isValid={isValid}
        layoutDirection={layoutDirection}
      />
    );
  });
  Adapter.displayName = `CustomNodeTemplateAdapter(${Template.displayName ?? Template.name ?? 'Anonymous'})`;
  return Adapter;
}

export function useNodeTypes(): NodeTypes {
  // Read outside useMemo so the dep stays referentially stable across renders.
  // When no consumer-provided templates exist, getCustomNodeTemplates() returns
  // the same frozen EMPTY object every call (see ../../../data/node-templates),
  // which is what keeps this memo from recomputing nodeTypes on every render.
  const custom = getCustomNodeTemplates();
  const nodeTypes = useMemo<NodeTypes>(() => {
    if (import.meta.env.DEV) {
      for (const key of Object.keys(custom)) {
        if (BUILT_IN_KEYS.has(key)) {
          console.warn(
            `[workflow-builder] nodeTemplates key "${key}" overrides a built-in renderer. Pick a unique key unless the override is intentional.`,
          );
        }
      }
    }
    const adaptedCustom: NodeTypes = {};
    for (const [key, Template] of Object.entries(custom)) {
      adaptedCustom[key] = adaptCustomNodeTemplate(Template);
    }
    return {
      [NodeType.Node]: NodeContainer,
      [NodeType.StartNode]: StartContainer,
      [NodeType.AiNode]: AiNodeContainer,
      [NodeType.DecisionNode]: DecisionNodeContainer,
      ...adaptedCustom,
    };
  }, [custom]);

  return nodeTypes;
}

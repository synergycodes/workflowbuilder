import {
  type DiagramModel,
  type IconType,
  NodeType,
  type WorkflowBuilderEdge,
  type WorkflowBuilderNode,
} from '@workflowbuilder/sdk';

import type { ExecutableNodeType } from '../../utils/project-executable-workflow';

type Properties = Record<string, unknown> & { label: string; description: string };

type NodeOptions = {
  id: string;
  type: ExecutableNodeType;
  label: string;
  description: string;
  icon: IconType;
  x: number;
  y: number;
  properties?: Record<string, unknown>;
};

const RENDERER_BY_TYPE: Record<ExecutableNodeType, string> = {
  trigger: NodeType.StartNode,
  action: NodeType.Node,
  delay: NodeType.Node,
  conditional: 'conditional',
  decision: 'decision',
  notification: NodeType.Node,
  'ai-agent': NodeType.AiNode,
  'multi-port': 'multi-port',
};

export function executableNode(options: NodeOptions): WorkflowBuilderNode {
  const properties: Properties = {
    label: options.label,
    description: options.description,
    ...options.properties,
  };
  return {
    id: options.id,
    type: RENDERER_BY_TYPE[options.type],
    position: { x: options.x, y: options.y },
    data: {
      type: options.type,
      icon: options.icon,
      properties,
      ...(options.type === 'trigger' ? { isStartNode: true } : {}),
    },
  };
}

export function executableEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle = 'source',
  label?: string,
): WorkflowBuilderEdge {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle: 'target',
    type: 'labelEdge',
    ...(label ? { data: { label } } : {}),
  };
}

export function executableDiagram(
  name: string,
  nodes: WorkflowBuilderNode[],
  edges: WorkflowBuilderEdge[],
): DiagramModel {
  return {
    name,
    layoutDirection: 'RIGHT',
    diagram: { nodes, edges, viewport: { x: 60, y: 80, zoom: 0.7 } },
  };
}

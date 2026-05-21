import type { ComponentType } from 'react';

import type { WorkflowNodeTemplateProps } from '../features/diagram/nodes/workflow-node-template/workflow-node-template';

type NodeTemplateComponent = ComponentType<WorkflowNodeTemplateProps>;

const EMPTY: Readonly<Record<string, NodeTemplateComponent>> = Object.freeze({});

let customNodeTemplates: Record<string, NodeTemplateComponent> = EMPTY;

export function setCustomNodeTemplates(templates: Record<string, NodeTemplateComponent> | null): void {
  customNodeTemplates = templates ?? EMPTY;
}

export function getCustomNodeTemplates(): Record<string, NodeTemplateComponent> {
  return customNodeTemplates;
}

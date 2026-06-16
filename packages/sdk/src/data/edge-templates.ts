import type { EdgeProps } from '@xyflow/react';
import type { ComponentType } from 'react';

import type { WorkflowBuilderEdge } from '../node/node-data';

type EdgeTemplateComponent = ComponentType<EdgeProps<WorkflowBuilderEdge>>;

const EMPTY: Readonly<Record<string, EdgeTemplateComponent>> = Object.freeze({});

let customEdgeTemplates: Record<string, EdgeTemplateComponent> = EMPTY;

export function setCustomEdgeTemplates(templates: Record<string, EdgeTemplateComponent> | null): void {
  customEdgeTemplates = templates ?? EMPTY;
}

export function getCustomEdgeTemplates(): Record<string, EdgeTemplateComponent> {
  return customEdgeTemplates;
}

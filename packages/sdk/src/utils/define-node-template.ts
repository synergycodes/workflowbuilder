import type { ComponentType } from 'react';

import type { WorkflowNodeTemplateProps } from '../features/diagram/nodes/workflow-node-template/workflow-node-template';

/**
 * Erases the per-schema `P` parameter from a typed node template so it can
 * be stored in a {@link NodeTemplatesMap} without consumer-side casts.
 *
 * The cast is safe in practice: SDK only mounts a template for a node
 * whose palette schema produces `P`. The pair (palette item, template)
 * carries the runtime guarantee; TypeScript cannot express that link, so
 * we erase the parameter here in one well-documented spot.
 *
 * @example
 * ```ts
 * type MultiPortProperties = NodeDataProperties<typeof multiPortSchema>;
 *
 * export const MultiPortNodeTemplate = defineNodeTemplate<MultiPortProperties>(
 *   memo(({ data }: WorkflowNodeTemplateProps<MultiPortProperties>) => {
 *     const status = data?.properties.status ?? 'active';
 *     return <NodePanel.Root>…</NodePanel.Root>;
 *   }),
 * );
 * ```
 *
 * @category Components
 */
export function defineNodeTemplate<P>(
  template: ComponentType<WorkflowNodeTemplateProps<P>>,
): ComponentType<WorkflowNodeTemplateProps> {
  return template as unknown as ComponentType<WorkflowNodeTemplateProps>;
}

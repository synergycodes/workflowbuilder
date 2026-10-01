import type { WorkflowBuilderStartContext } from './workflow-builder-root.types';

export function defaultOnStart({ isEmpty, openTemplates }: WorkflowBuilderStartContext): void {
  if (isEmpty) openTemplates();
}

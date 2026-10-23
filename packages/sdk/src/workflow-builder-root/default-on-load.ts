import type { WorkflowBuilderLoadContext } from './workflow-builder-root.types';

export function defaultOnLoad({ isEmpty, loadFailed, actions }: WorkflowBuilderLoadContext): void {
  if (isEmpty && !loadFailed) actions.openTemplates();
}

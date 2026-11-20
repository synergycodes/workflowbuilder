import type { TemplateModel } from '@workflowbuilder/sdk';

import { WorkflowProjectionError, projectExecutableWorkflow } from './project-executable-workflow';

export function validateExecutableTemplates(templates: readonly TemplateModel[]): void {
  const ids = new Set<number>();
  const names = new Set<string>();

  for (const template of templates) {
    if (ids.has(template.id)) throw new WorkflowProjectionError(`Duplicate template id ${template.id}.`);
    if (names.has(template.name)) throw new WorkflowProjectionError(`Duplicate template name "${template.name}".`);
    ids.add(template.id);
    names.add(template.name);
    projectExecutableWorkflow(template.value.diagram.nodes, template.value.diagram.edges);
  }
}

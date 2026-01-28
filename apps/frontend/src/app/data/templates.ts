import { TemplateModel } from '@workflow-builder/types/common';

import { snapToGridIfNeeded } from '@/utils/position-utils';

import { withOptionalFunctionPlugins } from '@/features/plugins-core/adapters/adapter-functions';

import { blackFriday } from './templates/black-friday';
import { callFlow } from './templates/call-flow';
import { simpleFlow } from './templates/simple-flow';
import { userRegistration } from './templates/user-registration';

function snapTemplateToGrid(template: TemplateModel) {
  return {
    ...template,
    value: {
      ...template.value,
      diagram: {
        ...template.value.diagram,
        nodes: template.value.diagram.nodes.map((node) => ({
          ...node,
          ...(node.position ? { position: snapToGridIfNeeded(node.position) } : {}),
        })),
      },
    },
  };
}

function getTemplatesFunction(): TemplateModel[] {
  return [simpleFlow, userRegistration, blackFriday, callFlow];
}

const getTemplates = withOptionalFunctionPlugins(getTemplatesFunction, 'getTemplates');

export const templates: TemplateModel[] = getTemplates().map(snapTemplateToGrid);

import { simpleFlow } from './templates/simple-flow';
import { userRegistration } from './templates/user-registration';
import { blackFriday } from './templates/black-friday';
import { callFlow } from './templates/call-flow';
import { TemplateModel } from '@workflow-builder/types/common';
import { snapToGridIfNeeded } from '@/utils/position-utils';

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

export const templates: TemplateModel[] = [simpleFlow, userRegistration, blackFriday, callFlow].map(snapTemplateToGrid);

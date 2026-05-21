import { withOptionalFunctionPlugins } from '../features/plugins-core/adapters/adapter-functions';

import type { TemplateModel } from '../node/common';
import { snapToGridIfNeeded } from '../utils/position-utils';

function snapTemplateToGrid(template: TemplateModel): TemplateModel {
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

let customTemplates: TemplateModel[] = [];

export function setCustomTemplates(ts: TemplateModel[] | null) {
  customTemplates = (ts ?? []).map(snapTemplateToGrid);
}

const getTemplatesFunction = (): TemplateModel[] => customTemplates;

export const getTemplates = withOptionalFunctionPlugins(getTemplatesFunction, 'getTemplates');

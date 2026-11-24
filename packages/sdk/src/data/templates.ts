import { withOptionalFunctionPlugins } from '../features/plugins-core/adapters/adapter-functions';

import type { DiagramModel, TemplateModel } from '../node/common';
import { snapToGridIfNeeded } from '../utils/position-utils';

export function snapDiagramToGrid(model: DiagramModel): DiagramModel {
  return {
    ...model,
    diagram: {
      ...model.diagram,
      nodes: model.diagram.nodes.map((node) => ({
        ...node,
        ...(node.position ? { position: snapToGridIfNeeded(node.position) } : {}),
      })),
    },
  };
}

function snapTemplateToGrid(template: TemplateModel): TemplateModel {
  return { ...template, value: snapDiagramToGrid(template.value) };
}

let customTemplates: TemplateModel[] = [];

export function setCustomTemplates(ts: TemplateModel[] | null) {
  customTemplates = (ts ?? []).map(snapTemplateToGrid);
}

const getTemplatesFunction = (): TemplateModel[] => customTemplates;

export const getTemplates = withOptionalFunctionPlugins(getTemplatesFunction, 'getTemplates');

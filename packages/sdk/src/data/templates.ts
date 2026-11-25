import { withOptionalFunctionPlugins } from '../features/plugins-core/adapters/adapter-functions';

import type { TemplateModel } from '../node/common';
import { snapToGridIfNeeded } from '../utils/position-utils';

// One offset for the whole template: snapping each node on its own rounds them apart and makes even gaps uneven.
function snapTemplateToGrid(template: TemplateModel): TemplateModel {
  const { nodes } = template.value.diagram;
  const anchor = nodes.find((node) => node.position)?.position;
  if (!anchor) return template;

  const snapped = snapToGridIfNeeded(anchor);
  const dx = snapped.x - anchor.x;
  const dy = snapped.y - anchor.y;

  return {
    ...template,
    value: {
      ...template.value,
      diagram: {
        ...template.value.diagram,
        nodes: nodes.map((node) =>
          node.position ? { ...node, position: { x: node.position.x + dx, y: node.position.y + dy } } : node,
        ),
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

import { describe, expect, it } from 'vitest';

import { SNAP_GRID } from '../features/diagram/diagram.const';
import type { TemplateModel } from '../node/common';
import type { WorkflowBuilderNode } from '../node/node-data';
import { getTemplates, setCustomTemplates } from './templates';

const node = (id: string, x: number, y: number) => ({ id, position: { x, y }, data: {} }) as WorkflowBuilderNode;

const template = (nodes: WorkflowBuilderNode[]) =>
  ({
    id: 1,
    name: 'Template',
    icon: 'Cube',
    value: {
      name: 'Template',
      layoutDirection: 'RIGHT',
      diagram: { nodes, edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    },
  }) as unknown as TemplateModel;

describe('setCustomTemplates', () => {
  it('moves an off-grid template onto the grid as a whole, keeping the gaps between nodes', () => {
    const [grid] = SNAP_GRID ?? [1];
    setCustomTemplates([template([node('a', 5, 7), node('b', 355, 7), node('c', 705, 257)])]);

    const [a, b, c] = getTemplates()[0].value.diagram.nodes.map((n) => n.position);

    expect(a.x % grid).toBe(0);
    expect(a.y % grid).toBe(0);
    expect(b.x - a.x).toBe(350);
    expect(c.x - b.x).toBe(350);
    expect(c.y - a.y).toBe(250);
  });
});

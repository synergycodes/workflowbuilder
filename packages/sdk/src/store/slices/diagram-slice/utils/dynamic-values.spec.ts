import { describe, expect, it } from 'vitest';

import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../../../node/node-data';
import { skipDynamicValuesInEdges, skipDynamicValuesInNodes } from './dynamic-values';

describe('skipDynamicValuesInNodes', () => {
  it('drops measured sizes and selection while keeping the rest of the node', () => {
    const node = {
      id: 'node-1',
      type: 'node',
      position: { x: 10, y: 20 },
      selected: true,
      measured: { width: 258, height: 64 },
      data: { label: 'Node' },
    } as unknown as WorkflowBuilderNode;

    const [result] = skipDynamicValuesInNodes([node]);

    expect(result).not.toHaveProperty('measured');
    expect(result.selected).toBe(false);
    expect(result).toMatchObject({ id: 'node-1', type: 'node', position: { x: 10, y: 20 }, data: { label: 'Node' } });
    expect(node.measured).toEqual({ width: 258, height: 64 });
  });
});

describe('skipDynamicValuesInEdges', () => {
  it('resets routing points and selection', () => {
    const edge = {
      id: 'edge-1',
      source: 'a',
      target: 'b',
      selected: true,
      data: { label: 'Edge', routerPointsFromAvoidNodes: [{ x: 1, y: 2 }], layoutPoints: [{ x: 3, y: 4 }] },
    } as unknown as WorkflowBuilderEdge;

    const [result] = skipDynamicValuesInEdges([edge]);

    expect(result.selected).toBe(false);
    expect(result.data).toMatchObject({ label: 'Edge', routerPointsFromAvoidNodes: [], layoutPoints: [] });
  });
});

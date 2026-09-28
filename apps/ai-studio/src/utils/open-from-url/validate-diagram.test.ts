import { describe, expect, it } from 'vitest';

import { aiStudioTemplates } from '../../data/ai-studio-templates';
import { knownNodeTypes } from '../../data/known-node-types';
import { validateDiagram } from './validate-diagram';

const known = new Set(['ai-studio/trigger', 'ai-studio/ai-agent']);

const trigger = {
  id: 'n-1',
  type: 'start-node',
  position: { x: 0, y: 0 },
  data: { type: 'ai-studio/trigger', icon: 'Lightning', properties: { label: 'Trigger' } },
  measured: { width: 240, height: 80 },
  selected: true,
  dragging: false,
};
const agent = {
  id: 'n-2',
  type: 'node',
  position: { x: 320, y: 0 },
  data: { type: 'ai-studio/ai-agent', icon: 'Robot', properties: {} },
};
const edge = { id: 'e-1', source: 'n-1', target: 'n-2', sourceHandle: 'source', targetHandle: 'target' };

function withNode(node: unknown) {
  return { nodes: [trigger, node], edges: [edge] };
}

describe('validateDiagram', () => {
  it('accepts a diagram the canvas can draw and drops the selection and drag state it was saved with', () => {
    const check = validateDiagram({ nodes: [trigger, agent], edges: [edge] }, known);

    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.unknownTypes).toEqual([]);
    expect(check.diagram.edges).toEqual([edge]);
    expect(check.diagram.nodes[0]).not.toHaveProperty('selected');
    expect(check.diagram.nodes[0]).not.toHaveProperty('dragging');
    expect(check.diagram.nodes[0]).toMatchObject({ id: 'n-1', measured: { width: 240, height: 80 } });
  });

  it.each(aiStudioTemplates.map((template) => [template.name, template] as const))(
    'accepts the %s template with every node type known',
    (_name, template) => {
      const check = validateDiagram(template.value.diagram, knownNodeTypes);

      expect(check).toMatchObject({ ok: true, unknownTypes: [] });
    },
  );

  it('lists palette types this app does not know, once each, and still accepts the diagram', () => {
    const foreign = { ...agent, id: 'n-3', data: { ...agent.data, type: 'acme/crm-lookup' } };
    const twin = { ...foreign, id: 'n-4' };

    const check = validateDiagram({ nodes: [trigger, foreign, twin], edges: [] }, known);

    expect(check).toMatchObject({ ok: true, unknownTypes: ['acme/crm-lookup'] });
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'diagram'],
    ['no node list', { edges: [] }],
    ['no edge list', { nodes: [] }],
  ])('refuses %s', (_name, value) => {
    expect(validateDiagram(value, known).ok).toBe(false);
  });

  // React Flow reads `position.x` unguarded, so a node without one takes the whole page down.
  it.each([
    ['no position', { ...agent, position: undefined }],
    ['a position that is not two numbers', { ...agent, position: { x: '10', y: 0 } }],
    ['no renderer type', { ...agent, type: undefined }],
    ['no data', { ...agent, data: undefined }],
    ['no properties', { ...agent, data: { type: 'ai-studio/ai-agent', icon: 'Robot' } }],
    ['no palette type', { ...agent, data: { icon: 'Robot', properties: {} } }],
    ['no id', { ...agent, id: undefined }],
  ])('refuses a node with %s and names it', (_name, node) => {
    const check = validateDiagram(withNode(node), known);

    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.reason).toMatch(/node/i);
  });

  it.each([
    ['no source', { ...edge, source: undefined }],
    ['no target', { ...edge, target: 42 }],
    ['no id', { ...edge, id: '' }],
  ])('refuses an edge with %s', (_name, badEdge) => {
    const check = validateDiagram({ nodes: [trigger, agent], edges: [badEdge] }, known);

    expect(check.ok).toBe(false);
  });
});

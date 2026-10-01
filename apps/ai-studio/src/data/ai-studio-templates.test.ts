import { describe, expect, it } from 'vitest';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import { humanDecisionNodeType } from '../nodes/human-decision';
import { aiStudioTemplates } from './ai-studio-templates';

type OutputSchema = { properties: Record<string, unknown>; required: string[]; additionalProperties?: unknown };

it('gives every template an id no other template uses', () => {
  const ids = aiStudioTemplates.map((template) => template.id);

  expect(new Set(ids).size).toBe(ids.length);
});

describe.each(aiStudioTemplates)('the $name template', ({ value }) => {
  const { nodes, edges } = value.diagram;
  const nodesOfType = (type: string) => nodes.filter((node) => node.data.type === type);
  const schemas = nodesOfType('ai-studio/ai-agent').flatMap((node) => {
    const schema = node.data.properties['outputSchema'] as OutputSchema | undefined;
    return schema ? [[node.id, schema] as const] : [];
  });

  it('connects every edge to nodes that exist', () => {
    const ids = new Set(nodes.map((node) => node.id));

    for (const edge of edges) {
      expect(ids.has(edge.source), edge.id).toBe(true);
      expect(ids.has(edge.target), edge.id).toBe(true);
    }
  });

  // A card shows the output of the source of its first incoming edge.
  it('gives every Visualize card a single incoming edge', () => {
    for (const card of nodesOfType('ai-studio/visualize')) {
      expect(edges.filter((edge) => edge.target === card.id).length, card.id).toBe(1);
    }
  });

  it('renders each human-decision node with its own template, with edges only from the ports it offers', () => {
    for (const node of nodesOfType(humanDecisionNodeType)) {
      const request = node.data.properties['decisionRequest'] as DecisionRequest;
      const ports = request.actions.flatMap((action) => ('port' in action ? [action.port] : []));

      expect(node.type, node.id).toBe(humanDecisionNodeType);
      for (const edge of edges.filter((edge) => edge.source === node.id)) {
        expect(ports, edge.id).toContain(edge.sourceHandle);
      }
    }
  });

  it("meets the provider's strict mode in every AI Agent schema: every field required, no extra keys", () => {
    for (const [id, schema] of schemas) {
      expect([...schema.required].sort(), id).toEqual(Object.keys(schema.properties).sort());
      expect(schema.additionalProperties, id).toBe(false);
    }
  });

  // An upstream output with a string `response` or `input` reaches an AI Agent as that field alone.
  it('keeps response and input out of AI Agent schemas and lookup records', () => {
    const records = nodesOfType('ai-studio/lookup').flatMap((node) =>
      Object.values(JSON.parse(String(node.data.properties['records'])) as Record<string, object>),
    );

    for (const fields of [...schemas.map(([, schema]) => schema.properties), ...records]) {
      expect(fields).not.toHaveProperty('response');
      expect(fields).not.toHaveProperty('input');
    }
  });
});

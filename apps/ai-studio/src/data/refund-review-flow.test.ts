import { describe, expect, it } from 'vitest';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import { humanDecisionNodeType } from '../nodes/human-decision';
import { defaultDecisionRequest } from '../nodes/human-decision/default-properties-data';
import { aiStudioTemplates } from './ai-studio-templates';
import { refundReviewFlow, refundReviewRequest } from './refund-review-flow';

const { nodes, edges } = refundReviewFlow.value.diagram;
const human = nodes.find((node) => node.id === 'human-1')!;
const draft = nodes.find((node) => node.id === 'draft-1')!;

type FormSchema = {
  properties: Record<string, { title?: unknown }>;
  required?: string[];
  additionalProperties?: unknown;
};
const draftSchema = draft.data.properties['outputSchema'] as FormSchema | undefined;
const draftFields = Object.keys(draftSchema?.properties ?? {});
const formProperties: Record<string, { title?: unknown }> = refundReviewRequest.schema.properties;
const edgesInto = (nodeId: string) => edges.filter((edge) => edge.target === nodeId);
const edgesOutOf = (nodeId: string) => edges.filter((edge) => edge.source === nodeId);
const ports = (request: DecisionRequest) =>
  request.actions.flatMap((action) => ('port' in action ? [action.port] : []));

describe('refundReviewFlow', () => {
  it('is registered once among the AI Studio templates, under an id no other template uses', () => {
    const ids = aiStudioTemplates.map((template) => template.id);

    expect(aiStudioTemplates.filter((template) => template === refundReviewFlow)).toHaveLength(1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders the human-decision node with its own template: the React Flow type is the palette type', () => {
    expect(human.type).toBe(humanDecisionNodeType);
    expect(human.data.type).toBe(humanDecisionNodeType);
    expect(human.data.properties['decisionRequest']).toBe(refundReviewRequest);
  });

  it('keeps the preset actions and ports, adding only the refund form', () => {
    expect(refundReviewRequest.actions).toEqual(defaultDecisionRequest.actions);
    expect(refundReviewRequest.version).toBe(1);
    expect(refundReviewRequest.schema.properties.orderDate.readOnly).toBe(true);
    expect(refundReviewRequest.schema.required).toEqual(['refundAmount']);
    expect(refundReviewRequest).not.toHaveProperty('proposalSourceNodeId');
  });

  it('gives the deciding node exactly one predecessor, as publishing requires', () => {
    expect(edgesInto('human-1').map((edge) => edge.source)).toEqual(['draft-1']);
  });

  it('draws one edge per action port and none from a port the request does not offer', () => {
    const handles = edgesOutOf('human-1').map((edge) => edge.sourceHandle);

    expect([...handles].sort()).toEqual([...ports(refundReviewRequest)].sort());
  });

  it('connects every edge to nodes that exist', () => {
    const ids = new Set(nodes.map((node) => node.id));

    for (const edge of edges) {
      expect(ids.has(edge.source), edge.id).toBe(true);
      expect(ids.has(edge.target), edge.id).toBe(true);
    }
  });
});

describe('the draft the person reviews', () => {
  it('is declared on the AI node as an output schema with a title on every field', () => {
    expect(draftFields).toEqual(['refundAmount', 'orderDate', 'replyDraft', 'internalReasoning']);
    for (const field of draftFields) {
      expect(typeof draftSchema?.properties[field]?.title, field).toBe('string');
    }
  });

  it("meets the provider's strict mode: every field required, no extra keys", () => {
    expect([...(draftSchema?.required ?? [])].sort()).toEqual([...draftFields].sort());
    expect(draftSchema?.additionalProperties).toBe(false);
  });

  it('shows the decision form every draft field except internalReasoning, under the same titles', () => {
    expect(Object.keys(formProperties)).toEqual(['refundAmount', 'orderDate', 'replyDraft']);
    for (const [field, declared] of Object.entries(formProperties)) {
      expect(declared.title, field).toBe(draftSchema?.properties[field]?.title);
    }
  });
});

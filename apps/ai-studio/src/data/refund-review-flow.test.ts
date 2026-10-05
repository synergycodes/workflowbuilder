import { describe, expect, it } from 'vitest';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import { humanDecisionNodeType } from '../nodes/human-decision';
import { defaultDecisionRequest } from '../nodes/human-decision/default-properties-data';
import { reviewNodeType } from '../nodes/review';
import { reviewDecisionRequest } from '../nodes/review/default-properties-data';
import { refundReviewOutputSchema } from '../utils/ai-agent/response-options';
import { editableFields } from '../utils/editor-form/editor-layout';
import { aiStudioTemplates } from './ai-studio-templates';
import { refundReviewFlow, refundReviewRequest, seniorReviewRequest } from './refund-review-flow';

const { nodes, edges } = refundReviewFlow.value.diagram;
const nodeById = (id: string) => nodes.find((node) => node.id === id)!;
const review = nodeById('review-1');
const senior = nodeById('senior-1');
const draft = nodeById('draft-1');
const brief = nodeById('escalate-1');

type Declared = Record<string, { title?: unknown; type?: unknown; readOnly?: unknown }>;
const draftProperties: Declared = refundReviewOutputSchema.properties;
const draftFields = Object.keys(draftProperties);
const reviewForm: Declared = refundReviewRequest.schema.properties;
const seniorForm: Declared = seniorReviewRequest.schema.properties;
const edgesInto = (nodeId: string) => edges.filter((edge) => edge.target === nodeId);
const edgesOutOf = (nodeId: string) => edges.filter((edge) => edge.source === nodeId);
const ports = (request: DecisionRequest) =>
  request.actions.flatMap((action) => ('port' in action ? [action.port] : []));
const portOf = (request: DecisionRequest, name: string) => {
  const action = request.actions.find((entry) => entry.name === name);
  return action && 'port' in action ? action.port : undefined;
};

describe('refundReviewFlow', () => {
  it('is registered once among the AI Studio templates, under an id no other template uses', () => {
    const ids = aiStudioTemplates.map((template) => template.id);

    expect(aiStudioTemplates.filter((template) => template === refundReviewFlow)).toHaveLength(1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders both deciders with their own templates: the React Flow type is the palette type', () => {
    expect(review.type).toBe(reviewNodeType);
    expect(review.data.type).toBe(reviewNodeType);
    expect(review.data.properties['decisionRequest']).toBe(refundReviewRequest);
    expect(senior.type).toBe(humanDecisionNodeType);
    expect(senior.data.type).toBe(humanDecisionNodeType);
    expect(senior.data.properties['decisionRequest']).toBe(seniorReviewRequest);
  });

  it("offers the Review preset's actions and ports on the first review, adding only the refund form", () => {
    expect(refundReviewRequest.actions).toEqual(reviewDecisionRequest.actions);
    expect(refundReviewRequest.version).toBe(1);
    expect(refundReviewRequest.schema.properties.orderDate.readOnly).toBe(true);
    expect(refundReviewRequest.schema.required).toEqual(['refundAmount']);
    expect(refundReviewRequest).not.toHaveProperty('proposalSourceNodeId');
  });

  it("offers the Human decision preset's actions on the senior review, over the brief's fields", () => {
    expect(seniorReviewRequest.actions).toEqual(defaultDecisionRequest.actions);
    expect(seniorReviewRequest.version).toBe(1);
    expect(seniorReviewRequest.schema.required).toEqual(['refundAmount']);
    expect(seniorReviewRequest).not.toHaveProperty('proposalSourceNodeId');
  });

  it('gives each deciding node exactly one predecessor, as publishing requires', () => {
    expect(edgesInto('review-1').map((edge) => edge.source)).toEqual(['draft-1']);
    expect(edgesInto('senior-1').map((edge) => edge.source)).toEqual(['escalate-1']);
  });

  it('reaches the brief only through Escalated, and the brief re-proposes in the shared refund schema', () => {
    expect(edgesInto('escalate-1').map((edge) => [edge.source, edge.sourceHandle])).toEqual([
      ['review-1', portOf(refundReviewRequest, 'escalate')],
    ]);
    expect(brief.data.type).toBe('ai-studio/ai-agent');
    expect(brief.data.properties['outputSchema']).toBe(refundReviewOutputSchema);
  });

  it('draws one edge per action port of each decider and none from a port it does not offer', () => {
    const reviewHandles = edgesOutOf('review-1').map((edge) => edge.sourceHandle);
    const seniorHandles = edgesOutOf('senior-1').map((edge) => edge.sourceHandle);

    expect([...reviewHandles].sort()).toEqual([...ports(refundReviewRequest)].sort());
    expect([...seniorHandles].sort()).toEqual([...ports(seniorReviewRequest)].sort());
  });

  it('joins both approvals into the confirmation and gives each rejection its own record', () => {
    const approvals = edgesInto('send-1').map((edge) => [edge.source, edge.sourceHandle]);

    expect([...approvals].sort()).toEqual([
      ['review-1', portOf(refundReviewRequest, 'approve')],
      ['senior-1', portOf(seniorReviewRequest, 'approve')],
    ]);
    expect(edgesInto('rejected-1').map((edge) => [edge.source, edge.sourceHandle])).toEqual([
      ['review-1', portOf(refundReviewRequest, 'reject')],
    ]);
    expect(edgesInto('rejected-2').map((edge) => [edge.source, edge.sourceHandle])).toEqual([
      ['senior-1', portOf(seniorReviewRequest, 'reject')],
    ]);
  });

  it('connects every edge to nodes that exist', () => {
    const ids = new Set(nodes.map((node) => node.id));

    for (const edge of edges) {
      expect(ids.has(edge.source), edge.id).toBe(true);
      expect(ids.has(edge.target), edge.id).toBe(true);
    }
  });
});

describe('the draft the first reviewer sees', () => {
  it('seeds the shared refund review schema, the one the Response format dropdown offers', () => {
    expect(draft.data.properties['outputSchema']).toBe(refundReviewOutputSchema);
  });

  it('lists the four draft fields, each with a title', () => {
    expect(draftFields).toEqual(['refundAmount', 'orderDate', 'replyDraft', 'internalReasoning']);
    for (const field of draftFields) {
      expect(typeof draftProperties[field]?.title, field).toBe('string');
    }
  });

  it("meets the provider's strict mode at the top level: every field required, no extra keys", () => {
    expect([...refundReviewOutputSchema.required].sort()).toEqual([...draftFields].sort());
    expect(refundReviewOutputSchema.additionalProperties).toBe(false);
  });

  // The confirmation sends the reply the person approves, so it has to stay a field they can correct.
  it('lets the person correct the amount and the reply, not the order date', () => {
    expect([...editableFields(refundReviewRequest.schema)]).toEqual(['refundAmount', 'replyDraft']);
  });

  it('puts every draft field except internalReasoning on the decision form, under the same titles and types', () => {
    expect(Object.keys(reviewForm)).toEqual(['refundAmount', 'orderDate', 'replyDraft']);
    for (const [field, declared] of Object.entries(reviewForm)) {
      expect(declared.title, field).toBe(draftProperties[field]?.title);
      expect(declared.type, field).toBe(draftProperties[field]?.type);
    }
  });
});

describe('the brief the senior reviewer sees', () => {
  it('puts every brief field on the decision form, under the same titles and types', () => {
    expect(Object.keys(seniorForm)).toEqual(draftFields);
    for (const [field, declared] of Object.entries(seniorForm)) {
      expect(declared.title, field).toBe(draftProperties[field]?.title);
      expect(declared.type, field).toBe(draftProperties[field]?.type);
    }
  });

  // The note explains the escalation; the senior reads it and corrects the numbers, not the note.
  it('lets the senior correct the amount and the reply, and read the order date and the reasoning', () => {
    expect([...editableFields(seniorReviewRequest.schema)]).toEqual(['refundAmount', 'replyDraft']);
    expect(seniorForm['orderDate']?.readOnly).toBe(true);
    expect(seniorForm['internalReasoning']?.readOnly).toBe(true);
  });
});

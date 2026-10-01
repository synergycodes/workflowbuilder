import { describe, expect, it } from 'vitest';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import { humanDecisionNodeType } from '../nodes/human-decision';
import { defaultDecisionRequest } from '../nodes/human-decision/default-properties-data';
import { editableFields } from '../utils/editor-form/editor-layout';
import { isPlainObject } from '../utils/is-plain-object';
import { triggerPayloadOf } from '../utils/trigger-payload';
import { aiStudioTemplates } from './ai-studio-templates';
import { claimAssessmentSchema, claimReviewFlow, claimReviewRequest } from './claim-review-flow';

const { nodes, edges } = claimReviewFlow.value.diagram;
const nodeById = (id: string) => nodes.find((node) => node.id === id)!;
const edgesInto = (nodeId: string) => edges.filter((edge) => edge.target === nodeId);
const edgesOutOf = (nodeId: string) => edges.filter((edge) => edge.source === nodeId);
const ports = (request: DecisionRequest) =>
  request.actions.flatMap((action) => ('port' in action ? [action.port] : []));

const assessmentProperties: Record<string, { title?: unknown; type?: unknown }> = claimAssessmentSchema.properties;
const assessmentFields = Object.keys(assessmentProperties);
const formProperties: Record<string, { title?: unknown; type?: unknown }> = claimReviewRequest.schema.properties;
const triggerPayload = triggerPayloadOf(String(nodeById('trigger-1').data.properties['inputPrompt']));

describe('claimReviewFlow', () => {
  it('is registered once among the AI Studio templates, under an id no other template uses', () => {
    const ids = aiStudioTemplates.map((template) => template.id);

    expect(aiStudioTemplates.filter((template) => template === claimReviewFlow)).toHaveLength(1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('connects every edge to nodes that exist', () => {
    const ids = new Set(nodes.map((node) => node.id));

    for (const edge of edges) {
      expect(ids.has(edge.source), edge.id).toBe(true);
      expect(ids.has(edge.target), edge.id).toBe(true);
    }
  });

  it('gives the deciding node exactly one predecessor, as publishing requires', () => {
    expect(edgesInto('review-1').map((edge) => edge.source)).toEqual(['assess-1']);
  });

  it('draws one edge per action port and none from a port the request does not offer', () => {
    const handles = edgesOutOf('review-1').map((edge) => edge.sourceHandle);

    expect([...handles].sort()).toEqual([...ports(claimReviewRequest)].sort());
  });

  // A card shows the output of the source of its first incoming edge.
  it('gives every Visualize card a single incoming edge', () => {
    const cards = nodes.filter((node) => node.data.type === 'ai-studio/visualize');

    expect(cards.map((card) => card.id).sort()).toEqual(['decline-1', 'sent-1']);
    for (const card of cards) {
      expect(edgesInto(card.id), card.id).toHaveLength(1);
    }
  });

  it('renders the human-decision node with its own template and the claim review request', () => {
    const review = nodeById('review-1');

    expect(review.type).toBe(humanDecisionNodeType);
    expect(review.data.type).toBe(humanDecisionNodeType);
    expect(review.data.properties['decisionRequest']).toBe(claimReviewRequest);
  });
});

describe('the lookups', () => {
  it('sends a JSON object from the trigger, so its policy number reads as {{trigger.policyNumber}}', () => {
    expect(typeof triggerPayload['policyNumber']).toBe('string');
  });

  it.each(['policy-1', 'history-1'])('%s keys on the policy number and holds a record for it', (id) => {
    const { key, records } = nodeById(id).data.properties;
    const table: unknown = JSON.parse(String(records));

    expect(key).toBe('{{trigger.policyNumber}}');
    expect(isPlainObject(table)).toBe(true);
    expect(Object.hasOwn(table as object, String(triggerPayload['policyNumber']))).toBe(true);
  });

  // A policy missing from either table would fail its lookup permanently.
  it('lists the same policies in both tables, each record an object without response or input', () => {
    const [policies, history] = ['policy-1', 'history-1'].map(
      (id) => JSON.parse(String(nodeById(id).data.properties['records'])) as Record<string, unknown>,
    );

    expect(Object.keys(history!).sort()).toEqual(Object.keys(policies!).sort());
    for (const record of [...Object.values(policies!), ...Object.values(history!)]) {
      expect(isPlainObject(record)).toBe(true);
      expect(record).not.toHaveProperty('response');
      expect(record).not.toHaveProperty('input');
    }
  });
});

describe('the assessment the person reviews', () => {
  it('is the schema on the assessing node', () => {
    expect(nodeById('assess-1').data.properties['outputSchema']).toBe(claimAssessmentSchema);
  });

  it("meets the provider's strict mode at the top level: every field required, no extra keys", () => {
    expect([...claimAssessmentSchema.required].sort()).toEqual([...assessmentFields].sort());
    expect(claimAssessmentSchema.additionalProperties).toBe(false);
    expect(assessmentFields).not.toContain('response');
    expect(assessmentFields).not.toContain('input');
  });

  it('keeps the preset actions and lets the person correct only the payout', () => {
    expect(claimReviewRequest.actions).toEqual(defaultDecisionRequest.actions);
    expect(claimReviewRequest.schema.required).toEqual(['proposedPayout']);
    expect([...editableFields(claimReviewRequest.schema)]).toEqual(['proposedPayout']);
  });

  it('puts assessment fields on the decision form, under the same titles and types', () => {
    for (const [field, declared] of Object.entries(formProperties)) {
      expect(assessmentFields, field).toContain(field);
      expect(declared.title, field).toBe(assessmentProperties[field]?.title);
      expect(declared.type, field).toBe(assessmentProperties[field]?.type);
    }
  });
});

import { describe, expect, it } from 'vitest';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import { defaultDecisionRequest } from '../nodes/human-decision/default-properties-data';
import { editableFields } from '../utils/editor-form/editor-layout';
import { triggerPayloadOf } from '../utils/trigger-payload';
import { aiStudioTemplates } from './ai-studio-templates';
import { claimAssessmentSchema, claimReviewFlow, claimReviewRequest } from './claim-review-flow';

const { nodes, edges } = claimReviewFlow.value.diagram;
const nodeById = (id: string) => nodes.find((node) => node.id === id)!;
const tableOf = (id: string) => JSON.parse(String(nodeById(id).data.properties['records'])) as Record<string, unknown>;
const ports = (request: DecisionRequest) =>
  request.actions.flatMap((action) => ('port' in action ? [action.port] : []));

const assessmentProperties: Record<string, { title?: unknown; type?: unknown }> = claimAssessmentSchema.properties;
const formProperties: Record<string, { title?: unknown; type?: unknown }> = claimReviewRequest.schema.properties;
const policyNumber = String(
  triggerPayloadOf(String(nodeById('trigger-1').data.properties['inputPrompt']))['policyNumber'],
);

describe('claimReviewFlow', () => {
  it('is registered once among the AI Studio templates', () => {
    expect(aiStudioTemplates.filter((template) => template === claimReviewFlow)).toHaveLength(1);
  });

  it('gives the deciding node the assessment as its only predecessor, as publishing requires', () => {
    expect(edges.filter((edge) => edge.target === 'review-1').map((edge) => edge.source)).toEqual(['assess-1']);
  });

  it('draws an edge from every action port of the claim review request', () => {
    const handles = edges.filter((edge) => edge.source === 'review-1').map((edge) => edge.sourceHandle);

    expect(nodeById('review-1').data.properties['decisionRequest']).toBe(claimReviewRequest);
    expect([...handles].sort()).toEqual([...ports(claimReviewRequest)].sort());
  });
});

describe('the lookups', () => {
  it.each(['policy-1', 'history-1'])('%s finds a record under the policy number the trigger sends', (id) => {
    expect(nodeById(id).data.properties['key']).toBe('{{trigger.policyNumber}}');
    expect(Object.hasOwn(tableOf(id), policyNumber)).toBe(true);
  });

  it('lists the same policies in both tables', () => {
    expect(Object.keys(tableOf('history-1')).sort()).toEqual(Object.keys(tableOf('policy-1')).sort());
  });
});

describe('the assessment the person reviews', () => {
  it('is the schema on the assessing node', () => {
    expect(nodeById('assess-1').data.properties['outputSchema']).toBe(claimAssessmentSchema);
  });

  it('keeps the preset actions and requires the payout, the one field the person may correct', () => {
    expect(claimReviewRequest.actions).toEqual(defaultDecisionRequest.actions);
    expect(claimReviewRequest.schema.required).toEqual(['proposedPayout']);
    expect([...editableFields(claimReviewRequest.schema)]).toEqual(['proposedPayout']);
  });

  it('puts assessment fields on the decision form, under the same titles and types', () => {
    for (const [field, declared] of Object.entries(formProperties)) {
      expect(Object.keys(assessmentProperties), field).toContain(field);
      expect(declared.title, field).toBe(assessmentProperties[field]?.title);
      expect(declared.type, field).toBe(assessmentProperties[field]?.type);
    }
  });
});

import type { JsonSchema, WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';
import { describe, expect, it } from 'vitest';

// The real receivers, not copies, as in ../../nodes/human-decision/decision-request-contract.test.ts
// (follow-up: decision-request-contract-test-home).
import { decisionRequestSchema } from '../../../../backend/src/domain/decision/decision-request-schema';
import { findDecisionRequest } from '../../../../backend/src/domain/decision/find-decision-request';
import { validateSubmittedDecision } from '../../../../backend/src/domain/decision/validate-submitted-decision';
import { workflowSnapshotSchema } from '../../../../backend/src/domain/mapper/snapshot-schema';
import { humanDecisionNodeType } from '../../nodes/human-decision';
import { defaultDecisionRequest } from '../../nodes/human-decision/default-properties-data';
import { FIELD_MODES, type FieldMode, fieldModeOf, fieldRows, withFieldMode } from './decision-fields';

const outputSchema = {
  type: 'object',
  properties: {
    refundAmount: { type: 'number', title: 'Refund amount' },
    orderDate: { type: 'string', title: 'Order date', description: 'Taken from the message', 'x-pii': true },
    replyDraft: { type: 'string', title: 'Reply draft' },
    internalReasoning: { type: 'string', title: 'Internal reasoning' },
    note: { type: ['string', 'null'] },
    lines: { type: 'array', items: { type: 'string' } },
    quantity: { type: 'integer' },
  },
};

const empty: JsonSchema = defaultDecisionRequest.schema;

function pick(schema: JsonSchema, key: string, mode: FieldMode): JsonSchema {
  return withFieldMode(schema, fieldRows(outputSchema, schema), key, mode);
}

const keysOf = (schema: unknown) => fieldRows(outputSchema, schema).map((row) => row.key);

describe('fieldRows', () => {
  it("lists the fields the decider's form can show, in the source's order, titled or named by key", () => {
    expect(fieldRows(outputSchema, empty).map(({ key, title }) => [key, title])).toEqual([
      ['refundAmount', 'Refund amount'],
      ['orderDate', 'Order date'],
      ['replyDraft', 'Reply draft'],
      ['internalReasoning', 'Internal reasoning'],
      ['note', 'note'],
    ]);
  });

  it('lists a field the request stores and the source no longer declares last, without a declaration', () => {
    const stored = { type: 'object', properties: { summary: { type: 'string', title: 'Summary' } } };

    expect(fieldRows(outputSchema, stored).at(-1)).toEqual({
      key: 'summary',
      title: 'Summary',
      declaration: undefined,
    });
  });

  it('with no source, lists only what the request stores', () => {
    const stored = { type: 'object', properties: { replyDraft: { type: 'string', title: 'Reply draft' } } };

    expect(fieldRows(undefined, stored)).toEqual([{ key: 'replyDraft', title: 'Reply draft', declaration: undefined }]);
  });
});

describe('fieldModeOf', () => {
  it('reads every field of the palette preset as Hidden', () => {
    expect(keysOf(empty).map((key) => fieldModeOf(empty, key))).toEqual(Array.from({ length: 5 }, () => 'hidden'));
  });

  it('reads the contract: left out is Hidden, readOnly is Read-only, listed in required is Required', () => {
    const schema = {
      type: 'object',
      properties: {
        refundAmount: { type: 'number' },
        orderDate: { type: 'string', readOnly: true },
        replyDraft: { type: 'string' },
      },
      required: ['refundAmount'],
    };

    expect(keysOf(schema).map((key) => fieldModeOf(schema, key))).toEqual([
      'required',
      'readOnly',
      'editable',
      'hidden',
      'hidden',
    ]);
  });
});

describe('withFieldMode', () => {
  it('writes the Refund Review picks in the contract shape, carrying the keywords the source declares', () => {
    let schema = pick(empty, 'refundAmount', 'required');
    schema = pick(schema, 'orderDate', 'readOnly');
    schema = pick(schema, 'replyDraft', 'editable');

    expect(schema).toEqual({
      type: 'object',
      properties: {
        refundAmount: { type: 'number', title: 'Refund amount' },
        orderDate: {
          type: 'string',
          title: 'Order date',
          description: 'Taken from the message',
          'x-pii': true,
          readOnly: true,
        },
        replyDraft: { type: 'string', title: 'Reply draft' },
      },
      required: ['refundAmount'],
    });
    expect(defaultDecisionRequest.schema).toEqual({ type: 'object', properties: {} });
  });

  it('round trip: a pick reads back as picked and leaves every other field as it was', () => {
    const start = pick(pick(empty, 'refundAmount', 'required'), 'orderDate', 'readOnly');

    for (const key of keysOf(start)) {
      for (const mode of FIELD_MODES) {
        const next = pick(start, key, mode);
        expect(fieldModeOf(next, key), `${key}=${mode}`).toBe(mode);
        for (const other of keysOf(start).filter((candidate) => candidate !== key)) {
          expect(fieldModeOf(next, other), `${key}=${mode}, ${other}`).toBe(fieldModeOf(start, other));
        }
      }
    }
  });

  it('drops null from a nullable type picked Required, and Editable brings it back', () => {
    const required = pick(empty, 'note', 'required');

    expect(required.properties?.['note']).toEqual({ type: 'string' });
    expect(pick(required, 'note', 'editable').properties?.['note']).toEqual({ type: ['string', 'null'] });
  });

  it('leaves required out once no field is required', () => {
    expect(pick(pick(empty, 'refundAmount', 'required'), 'refundAmount', 'editable')).not.toHaveProperty('required');
  });

  it('keeps a field the source no longer declares until the author hides it', () => {
    const stored: JsonSchema = { type: 'object', properties: { summary: { type: 'string', title: 'Summary' } } };

    const kept = pick(stored, 'refundAmount', 'editable');
    expect(Object.keys(kept.properties ?? {})).toEqual(['refundAmount', 'summary']);
    expect(Object.keys(pick(kept, 'summary', 'hidden').properties ?? {})).toEqual(['refundAmount']);
  });

  it('drops a stored field of a type the editor cannot show once another field is picked', () => {
    const stored: JsonSchema = {
      type: 'object',
      properties: { quantity: { type: 'integer' }, refundAmount: { type: 'number', title: 'Refund amount' } },
    };

    const next = pick(stored, 'refundAmount', 'editable');

    expect(Object.keys(next.properties ?? {})).toEqual(['refundAmount']);
  });
});

function outcomeOf(schema: JsonSchema, edits: Record<string, unknown>): string {
  const nodes: WorkflowBuilderNode[] = [
    {
      id: 'draft-1',
      type: 'node',
      position: { x: 0, y: 0 },
      data: {
        segments: [],
        properties: { label: 'Draft', description: '', systemPrompt: '', webSearch: false },
        type: 'ai-studio/ai-agent',
        icon: 'AiAgent',
      },
    },
    {
      id: 'human-1',
      type: humanDecisionNodeType,
      position: { x: 350, y: 0 },
      data: {
        segments: [],
        properties: { label: 'Review', description: '', decisionRequest: { ...defaultDecisionRequest, schema } },
        type: humanDecisionNodeType,
        icon: 'UserCheck',
      },
    },
  ];
  const edges: WorkflowBuilderEdge[] = [
    {
      id: 'edge-1',
      source: 'draft-1',
      sourceHandle: 'source',
      target: 'human-1',
      targetHandle: 'target',
      type: 'labelEdge',
      data: {},
    },
  ];
  const parsed = workflowSnapshotSchema.safeParse(structuredClone({ nodes, edges }));
  if (!parsed.success) throw new Error(`snapshot refused: ${JSON.stringify(parsed.error.issues)}`);
  const found = findDecisionRequest(parsed.data, 'human-1');
  if (found.error !== undefined) throw new Error(found.error);
  return validateSubmittedDecision(found.request, { action: 'approve', edits }).error?.code ?? 'accepted';
}

describe('the backend takes the stored schema as it is', () => {
  const EDIT_OUTCOME: Record<FieldMode, string> = {
    hidden: 'unknown_field',
    readOnly: 'field_not_editable',
    editable: 'accepted',
    required: 'accepted',
  };

  it('every pick from the palette preset parses with decisionRequestSchema', () => {
    for (const key of keysOf(empty)) {
      for (const mode of FIELD_MODES) {
        const parsed = decisionRequestSchema.safeParse({ ...defaultDecisionRequest, schema: pick(empty, key, mode) });
        expect(parsed.success, `${key}=${mode}: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`).toBe(
          true,
        );
      }
    }
  });

  it.each(FIELD_MODES)('an edit to a field picked %s gets the answer the pick promises', (mode) => {
    for (const key of keysOf(empty)) {
      expect(outcomeOf(pick(empty, key, mode), { [key]: 'x' }), key).toBe(EDIT_OUTCOME[mode]);
    }
  });

  it('emptying a Required field is refused; emptying an Editable one is not', () => {
    expect(outcomeOf(pick(empty, 'replyDraft', 'required'), { replyDraft: null })).toBe('required_field_missing');
    expect(outcomeOf(pick(empty, 'replyDraft', 'editable'), { replyDraft: null })).toBe('accepted');
  });
});

import type { JsonSchema7 } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';

import { getSuggestionsFromSchemaOutput } from './get-suggestions-from-schema-output';

const NODE_ID = 'node-1';
const NODE_LABEL = 'Fetch';

function schema(properties: NonNullable<JsonSchema7['properties']>): JsonSchema7 {
  return { type: 'object', properties };
}

function suggestions(properties: JsonSchema7, nodeLabel = NODE_LABEL) {
  return getSuggestionsFromSchemaOutput({ nodeId: NODE_ID, nodeLabel, properties });
}

describe('getSuggestionsFromSchemaOutput', () => {
  it('returns nothing for a schema without properties', () => {
    expect(suggestions(schema({}))).toEqual([]);
  });

  it('returns nothing when the root schema is not an object', () => {
    expect(suggestions({ type: 'string' })).toEqual([]);
  });

  it('derives every field from the property key when the schema has no title or description', () => {
    expect(suggestions(schema({ result: { type: 'string' } }))).toEqual([
      {
        id: `nodes.${NODE_ID}.result`,
        display: 'Fetch · Result',
        label: 'Result',
        description: 'Result',
        type: 'string',
      },
    ]);
  });

  it('prefers the schema title and description over the key', () => {
    expect(
      suggestions(schema({ status: { type: 'number', title: 'Status code', description: 'Response status' } })),
    ).toEqual([
      {
        id: `nodes.${NODE_ID}.status`,
        display: 'Fetch · Status code',
        label: 'Status code',
        description: 'Response status',
        type: 'number',
      },
    ]);
  });

  it('truncates the node label and the property label in display only', () => {
    const [suggestion] = suggestions(
      schema({ body: { type: 'string', title: 'Response payload body' } }),
      'A very long node label',
    );

    expect(suggestion?.display).toBe('A very long nod... · Response payloa...');
    expect(suggestion?.label).toBe('Response payload body');
  });

  it('truncates a label derived from the key but keeps the description whole', () => {
    const [suggestion] = suggestions(schema({ someVeryLongPropertyNameForTesting: { type: 'string' } }));

    expect(suggestion?.label).toBe('Some very long property n...');
    expect(suggestion?.description).toBe('Some very long property name for testing');
  });

  it('omits the node label from display when it is empty', () => {
    const [suggestion] = suggestions(schema({ result: { type: 'string' } }), '');

    expect(suggestion?.display).toBe('Result');
  });

  it('flattens nested objects into dotted ids and labels display by the last path segment', () => {
    expect(suggestions(schema({ response: { type: 'object', properties: { body: { type: 'string' } } } }))).toEqual([
      {
        id: `nodes.${NODE_ID}.response`,
        display: 'Fetch · Response',
        label: 'Response',
        description: 'Response',
        type: 'object',
      },
      {
        id: `nodes.${NODE_ID}.response.body`,
        display: 'Fetch · Body',
        label: 'Response body',
        description: 'Response body',
        type: 'string',
      },
    ]);
  });

  it('maps a date-time string to the datetime type', () => {
    const [suggestion] = suggestions(schema({ createdAt: { type: 'string', format: 'date-time' } }));

    expect(suggestion?.type).toBe('datetime');
  });

  it('skips properties whose type is not a variable type', () => {
    const result = suggestions(schema({ count: { type: 'integer' }, name: { type: 'string' } }));

    expect(result.map(({ id }) => id)).toEqual([`nodes.${NODE_ID}.name`]);
  });

  it('keeps the schema declaration order', () => {
    const result = suggestions(schema({ b: { type: 'string' }, a: { type: 'number' }, c: { type: 'boolean' } }));

    expect(result.map(({ id }) => id)).toEqual([`nodes.${NODE_ID}.b`, `nodes.${NODE_ID}.a`, `nodes.${NODE_ID}.c`]);
  });
});

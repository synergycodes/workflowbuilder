import { describe, expect, it } from 'vitest';

import { type ExecutionContext, PermanentNodeExecutionError } from '@workflow-builder/execution-core';

import type { LookupNode } from '../domain/ai-studio-nodes';
import { executeLookup } from './lookup';

const orders = {
  'ORD-1': { customer: 'Ada', total: 120 },
  'ORD-2': { customer: 'Grace', items: [] },
  '42': { customer: 'Alan' },
};

function context(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    workflowId: 'wf',
    executionId: 'exec',
    triggerPayload: {},
    nodeOutputs: {},
    variables: {},
    global: {},
    ...overrides,
  };
}

function lookupNode(key: string, records: string = JSON.stringify(orders)): LookupNode {
  return { id: 'l1', type: 'ai-studio/lookup', config: { key, records } };
}

function expectPermanent(run: () => unknown, code: string) {
  expect(run).toThrow(PermanentNodeExecutionError);
  expect(run).toThrow(expect.objectContaining({ code }));
}

describe('executeLookup', () => {
  it('returns the record under a literal key as the node output', () => {
    expect(executeLookup(lookupNode('ORD-1'), context())).toEqual({ output: { customer: 'Ada', total: 120 } });
  });

  it('resolves the key from a trigger field', () => {
    const result = executeLookup(lookupNode('{{trigger.orderId}}'), context({ triggerPayload: { orderId: 'ORD-2' } }));

    expect(result.output).toEqual({ customer: 'Grace', items: [] });
  });

  it('matches a numeric trigger field against a string record key', () => {
    const result = executeLookup(lookupNode('{{trigger.orderId}}'), context({ triggerPayload: { orderId: 42 } }));

    expect(result.output).toEqual({ customer: 'Alan' });
  });

  it('ignores whitespace around the resolved key', () => {
    const result = executeLookup(
      lookupNode(' {{trigger.orderId}} '),
      context({ triggerPayload: { orderId: ' ORD-1\n' } }),
    );

    expect(result.output).toEqual({ customer: 'Ada', total: 120 });
  });

  it('fails permanently with the key in the message when no record matches', () => {
    expect(() => executeLookup(lookupNode('ORD-404'), context())).toThrow(
      expect.objectContaining({ code: 'lookup_record_not_found', message: expect.stringContaining('"ORD-404"') }),
    );
  });

  it('fails permanently when the key resolves to an empty string', () => {
    expectPermanent(() => executeLookup(lookupNode('{{trigger.orderId?}}'), context()), 'lookup_record_not_found');
  });

  it('fails permanently when the node carries no key', () => {
    const node = { id: 'l1', type: 'ai-studio/lookup', config: { records: '{}' } } as unknown as LookupNode;

    expectPermanent(() => executeLookup(node, context()), 'lookup_record_not_found');
  });

  it.each(['constructor', '__proto__'])('does not find "%s" through Object.prototype', (key) => {
    expectPermanent(() => executeLookup(lookupNode(key), context()), 'lookup_record_not_found');
  });

  it('keeps the template error code when the key reference does not resolve', () => {
    expectPermanent(() => executeLookup(lookupNode('{{trigger.missing}}'), context()), 'template_unresolved');
  });

  it.each([
    ['records that are not JSON', '{ not json'],
    ['records that are an array', '[{ "customer": "Ada" }]'],
    ['records that are a JSON string', '"ORD-1"'],
    ['records that are null', 'null'],
    ['a record that is not an object', '{ "ORD-1": "Ada" }'],
    ['a record that is an array', '{ "ORD-1": ["Ada"] }'],
    ['empty records', ''],
  ])('fails permanently on %s', (_, records) => {
    expectPermanent(() => executeLookup(lookupNode('ORD-1', records), context()), 'lookup_records_invalid');
  });

  it('fails permanently when the node carries no records', () => {
    const node = { id: 'l1', type: 'ai-studio/lookup', config: { key: 'ORD-1' } } as unknown as LookupNode;

    expectPermanent(() => executeLookup(node, context()), 'lookup_records_invalid');
  });

  it('checks the records before resolving the key', () => {
    expectPermanent(() => executeLookup(lookupNode('{{trigger.missing}}', '[]'), context()), 'lookup_records_invalid');
  });
});

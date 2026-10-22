import { describe, expect, it } from 'vitest';

import type { PaletteItem } from '../../../../../node/common';
import type { WorkflowBuilderNode } from '../../../../../node/node-data';
import type { VariableSuggestion } from '../../../components/variable-text/variable-text.types';
import type { VariableDefinition } from '../../../types';
import { SUGGESTION_NODE_TYPE } from '../../types';
import { getSuggestionsNodeData } from './get-suggestions-node-data';

const NODE_ID = 'node-1';

function definition(overrides: Record<string, unknown>): PaletteItem {
  return {
    type: 'fetch',
    label: 'Fetch',
    description: '',
    icon: 'PlayCircle',
    defaultPropertiesData: {},
    schema: { type: 'object', properties: {} },
    ...overrides,
  } as unknown as PaletteItem;
}

function variantDefinition(variants: unknown[]): PaletteItem {
  return definition({ schemaOutput: { type: 'variant', variants } });
}

function node(properties: Record<string, unknown> = {}): WorkflowBuilderNode {
  return {
    id: NODE_ID,
    type: 'node',
    position: { x: 0, y: 0 },
    data: { type: 'fetch', icon: 'PlayCircle', properties },
  } as unknown as WorkflowBuilderNode;
}

function schema(...keys: string[]) {
  return { type: 'object', properties: Object.fromEntries(keys.map((key) => [key, { type: 'string' }])) };
}

function flat(...keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, { type: 'string' }]));
}

function variable(id: string): VariableDefinition {
  return { id, name: id, type: 'string', defaultValue: '', description: '' };
}

const idsOf = (suggestions: VariableSuggestion[] | undefined) => suggestions?.map(({ id }) => id);
const ref = (key: string) => `nodes.${NODE_ID}.${key}`;

describe('getSuggestionsNodeData', () => {
  it('returns empty custom suggestions when the definition declares no output', () => {
    expect(getSuggestionsNodeData({ definition: definition({}), node: node() })).toStrictEqual({
      type: SUGGESTION_NODE_TYPE.CUSTOM,
      bySourceHandle: { every: [] },
    });
  });

  it('returns empty custom suggestions for an unknown schemaOutput type', () => {
    expect(
      getSuggestionsNodeData({ definition: definition({ schemaOutput: { type: 'unknown' } }), node: node() }),
    ).toStrictEqual({
      type: SUGGESTION_NODE_TYPE.CUSTOM,
      bySourceHandle: { every: [] },
    });
  });

  it('forwards the node label to the suggestions', () => {
    const { bySourceHandle } = getSuggestionsNodeData({
      definition: definition({ schemaOutput: { type: 'default', bySourceHandle: { every: schema('result') } } }),
      node: node({ label: 'My fetch' }),
    });

    expect(bySourceHandle.every?.[0]?.display).toMatch(/^My fetch/);
  });

  describe('schemaOutput default', () => {
    it('indexes each source handle separately as common suggestions', () => {
      const result = getSuggestionsNodeData({
        definition: definition({
          schemaOutput: { type: 'default', bySourceHandle: { success: schema('result'), error: schema('message') } },
        }),
        node: node(),
      });

      expect(result.type).toBe(SUGGESTION_NODE_TYPE.COMMON);
      expect(idsOf(result.bySourceHandle.every)).toEqual([]);
      expect(idsOf(result.bySourceHandle.success)).toEqual([ref('result')]);
      expect(idsOf(result.bySourceHandle.error)).toEqual([ref('message')]);
    });

    it('skips handles without a schema', () => {
      const result = getSuggestionsNodeData({
        definition: definition({
          schemaOutput: { type: 'default', bySourceHandle: { every: schema('result'), error: undefined } },
        }),
        node: node(),
      });

      expect(Object.keys(result.bySourceHandle)).toEqual(['every']);
    });

    it('takes precedence over the deprecated outputSchema', () => {
      const result = getSuggestionsNodeData({
        definition: definition({
          schemaOutput: { type: 'default', bySourceHandle: { every: schema('fresh') } },
          outputSchema: { type: 'default', properties: flat('stale') },
        }),
        node: node(),
      });

      expect(idsOf(result.bySourceHandle.every)).toEqual([ref('fresh')]);
    });
  });

  describe('schemaOutput variant', () => {
    it('always includes a variant without a rule as custom suggestions', () => {
      const result = getSuggestionsNodeData({
        definition: variantDefinition([{ variantRule: undefined, bySourceHandle: { every: schema('result') } }]),
        node: node(),
      });

      expect(result.type).toBe(SUGGESTION_NODE_TYPE.CUSTOM);
      expect(idsOf(result.bySourceHandle.every)).toEqual([ref('result')]);
    });

    it('includes a variant only when the property at the rule path equals the rule value', () => {
      const definition = variantDefinition([
        {
          variantRule: { onlyIfPropertyNameEquals: { path: 'options.mode', value: 'json' } },
          bySourceHandle: { every: schema('parsed') },
        },
      ]);
      const matching = getSuggestionsNodeData({ definition, node: node({ options: { mode: 'json' } }) });
      const other = getSuggestionsNodeData({ definition, node: node({ options: { mode: 'text' } }) });

      expect(idsOf(matching.bySourceHandle.every)).toEqual([ref('parsed')]);
      expect(idsOf(other.bySourceHandle.every)).toEqual([]);
    });

    it('merges every matching variant into the same handle in declaration order', () => {
      const result = getSuggestionsNodeData({
        definition: variantDefinition([
          { variantRule: undefined, bySourceHandle: { every: schema('first') } },
          {
            variantRule: { onlyIfPropertyNameEquals: { path: 'mode', value: 'json' } },
            bySourceHandle: { every: schema('second') },
          },
          {
            variantRule: { onlyIfPropertyNameEquals: { path: 'mode', value: 'text' } },
            bySourceHandle: { every: schema('skipped') },
          },
        ]),
        node: node({ mode: 'json' }),
      });

      expect(idsOf(result.bySourceHandle.every)).toEqual([ref('first'), ref('second')]);
    });

    it('adds variables read from a node property to every listed handle', () => {
      const result = getSuggestionsNodeData({
        definition: variantDefinition([
          { variantRule: { fromValueOfPropertyPath: 'outputs', toSourceHandles: ['success', 'every'] } },
        ]),
        node: node({ outputs: { a: variable('a'), b: variable('b') } }),
      });

      expect(idsOf(result.bySourceHandle.success)).toEqual([ref('a'), ref('b')]);
      expect(idsOf(result.bySourceHandle.every)).toEqual([ref('a'), ref('b')]);
    });

    it('adds nothing when the property does not hold a valid variables index', () => {
      const result = getSuggestionsNodeData({
        definition: variantDefinition([
          { variantRule: { fromValueOfPropertyPath: 'outputs', toSourceHandles: ['success'] } },
        ]),
        node: node({ outputs: { a: { id: 'a' } } }),
      });

      expect(result.bySourceHandle).toStrictEqual({ every: [] });
    });

    it('gates variables read from a property by the equality rule', () => {
      const definition = variantDefinition([
        {
          variantRule: {
            onlyIfPropertyNameEquals: { path: 'mode', value: 'custom' },
            fromValueOfPropertyPath: 'outputs',
            toSourceHandlesTypes: ['success'],
          },
        },
      ]);
      const outputs = { a: variable('a') };
      const matching = getSuggestionsNodeData({ definition, node: node({ mode: 'custom', outputs }) });
      const other = getSuggestionsNodeData({ definition, node: node({ mode: 'fixed', outputs }) });

      expect(idsOf(matching.bySourceHandle.success)).toEqual([ref('a')]);
      expect(other.bySourceHandle.success).toBeUndefined();
    });

    it('appends property variables after schema variables on a shared handle', () => {
      const result = getSuggestionsNodeData({
        definition: variantDefinition([
          { variantRule: undefined, bySourceHandle: { success: schema('status') } },
          { variantRule: { fromValueOfPropertyPath: 'outputs', toSourceHandles: ['success'] } },
        ]),
        node: node({ outputs: { a: variable('a') } }),
      });

      expect(idsOf(result.bySourceHandle.success)).toEqual([ref('status'), ref('a')]);
    });
  });

  describe('deprecated outputSchema', () => {
    it('indexes default properties under every as common suggestions', () => {
      const result = getSuggestionsNodeData({
        definition: definition({ outputSchema: { type: 'default', properties: flat('result', 'status') } }),
        node: node(),
      });

      expect(result.type).toBe(SUGGESTION_NODE_TYPE.COMMON);
      expect(idsOf(result.bySourceHandle.every)).toEqual([ref('result'), ref('status')]);
      expect(Object.keys(result.bySourceHandle)).toEqual(['every']);
    });

    it('uses only the first variant whose rule matches the node property', () => {
      const result = getSuggestionsNodeData({
        definition: definition({
          outputSchema: {
            type: 'variant',
            variants: {
              text: { variantRule: { dataPropertyName: 'mode', dataPropertyValue: 'text' }, properties: flat('text') },
              json: { variantRule: { dataPropertyName: 'mode', dataPropertyValue: 'json' }, properties: flat('json') },
              jsonAgain: {
                variantRule: { dataPropertyName: 'mode', dataPropertyValue: 'json' },
                properties: flat('ignored'),
              },
            },
          },
        }),
        node: node({ mode: 'json' }),
      });

      expect(result.type).toBe(SUGGESTION_NODE_TYPE.CUSTOM);
      expect(idsOf(result.bySourceHandle.every)).toEqual([ref('json')]);
    });

    it('treats a variant without a rule as a match', () => {
      const result = getSuggestionsNodeData({
        definition: definition({
          outputSchema: {
            type: 'variant',
            variants: { fallback: { variantRule: undefined, properties: flat('fallback') } },
          },
        }),
        node: node({ mode: 'anything' }),
      });

      expect(idsOf(result.bySourceHandle.every)).toEqual([ref('fallback')]);
    });

    it('compares the rule value strictly', () => {
      const result = getSuggestionsNodeData({
        definition: definition({
          outputSchema: {
            type: 'variant',
            variants: {
              one: { variantRule: { dataPropertyName: 'count', dataPropertyValue: '1' }, properties: flat('one') },
            },
          },
        }),
        node: node({ count: 1 }),
      });

      expect(result.bySourceHandle.every).toBeUndefined();
    });

    it('returns custom suggestions without handles when no variant matches', () => {
      const result = getSuggestionsNodeData({
        definition: definition({
          outputSchema: {
            type: 'variant',
            variants: {
              text: { variantRule: { dataPropertyName: 'mode', dataPropertyValue: 'text' }, properties: flat('text') },
            },
          },
        }),
        node: node({ mode: 'json' }),
      });

      expect(result).toStrictEqual({ type: SUGGESTION_NODE_TYPE.CUSTOM, bySourceHandle: {} });
    });
  });
});

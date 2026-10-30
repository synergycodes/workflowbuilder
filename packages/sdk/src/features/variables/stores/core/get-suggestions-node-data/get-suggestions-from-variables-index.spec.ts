import { describe, expect, it } from 'vitest';

import type { VariableDefinition, VariablesIndex } from '../../../types';
import { getSuggestionsFromVariablesIndex } from './get-suggestions-from-variables-index';

const NODE_ID = 'node-1';
const NODE_LABEL = 'Fetch';

function variable(id: string, overrides: Partial<VariableDefinition> = {}): VariableDefinition {
  return { id, name: id, type: 'string', defaultValue: '', description: '', ...overrides };
}

function global(variablesIndex: VariablesIndex) {
  return getSuggestionsFromVariablesIndex({ variant: 'global', variablesIndex });
}

function nodes(variablesIndex: VariablesIndex, nodeLabel = NODE_LABEL) {
  return getSuggestionsFromVariablesIndex({ variant: 'nodes', nodeId: NODE_ID, nodeLabel, variablesIndex });
}

const idsOf = (suggestions: { id: string }[]) => suggestions.map(({ id }) => id);

describe('getSuggestionsFromVariablesIndex', () => {
  it('returns nothing for an empty index', () => {
    expect(global({})).toEqual([]);
    expect(nodes({})).toEqual([]);
  });

  it('skips undefined entries', () => {
    const variablesIndex: VariablesIndex = { a: variable('a'), gone: undefined, b: variable('b') };

    expect(idsOf(global(variablesIndex))).toEqual(['global.a', 'global.b']);
    expect(idsOf(nodes(variablesIndex))).toEqual([`nodes.${NODE_ID}.a`, `nodes.${NODE_ID}.b`]);
  });

  it('builds the id from the definition id, not the index key', () => {
    const variablesIndex: VariablesIndex = { key: variable('real') };

    expect(idsOf(global(variablesIndex))).toEqual(['global.real']);
    expect(idsOf(nodes(variablesIndex))).toEqual([`nodes.${NODE_ID}.real`]);
  });

  describe('global variant', () => {
    it('maps a definition to a global suggestion', () => {
      expect(
        global({ token: variable('token', { name: 'API token', description: 'Auth header', type: 'number' }) }),
      ).toEqual([
        { id: 'global.token', display: 'API token', label: 'API token', description: 'Auth header', type: 'number' },
      ]);
    });

    it('truncates display at 25 characters but keeps the label whole', () => {
      const [suggestion] = global({ a: variable('a', { name: 'A very long global variable name' }) });

      expect(suggestion?.display).toBe('A very long global variab...');
      expect(suggestion?.label).toBe('A very long global variable name');
    });
  });

  describe('nodes variant', () => {
    it('maps a definition to a node suggestion prefixed with the node label', () => {
      expect(nodes({ out: variable('out', { name: 'Output', description: 'Node result', type: 'boolean' }) })).toEqual([
        {
          id: `nodes.${NODE_ID}.out`,
          display: 'Fetch · Output',
          label: 'Output',
          description: 'Node result',
          type: 'boolean',
        },
      ]);
    });

    it('truncates the node label and the name at 15 characters in display only', () => {
      const [suggestion] = nodes(
        { body: variable('body', { name: 'Response payload body' }) },
        'A very long node label',
      );

      expect(suggestion?.display).toBe('A very long nod... · Response payloa...');
      expect(suggestion?.label).toBe('Response payload body');
    });

    it('omits the node label from display when it is empty', () => {
      const [suggestion] = nodes({ out: variable('out', { name: 'Output' }) }, '');

      expect(suggestion?.display).toBe('Output');
    });
  });
});

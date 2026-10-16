import { beforeEach, describe, expect, it } from 'vitest';

import { resetWorkflowStore, useStore } from '../../../store/store';
import { mockNodeDelay } from '../../../utils/validation/get-node-errors.mock';
import { SUGGESTION_NODE_TYPE } from '../stores/types';
import { emptyVariablesSuggestionsStore, useVariablesSuggestionsStore } from '../stores/use-variable-suggestions-store';
import { getStringVariableTypeIfPossible } from './get-string-variable-type-if-possible';

const nodeId = 'node-1';

describe('getStringVariableTypeIfPossible', () => {
  beforeEach(() => {
    resetWorkflowStore();
    useVariablesSuggestionsStore.setState(emptyVariablesSuggestionsStore, true);

    useStore.setState({
      nodes: [{ ...mockNodeDelay, id: nodeId }],
      globalVariables: {
        total: { id: 'total', name: 'Total', type: 'number', defaultValue: '0', description: '' },
        name: { id: 'name', name: 'Name', type: 'string', defaultValue: '', description: '' },
        active: { id: 'active', name: 'Active', type: 'boolean', defaultValue: 'false', description: '' },
        due: { id: 'due', name: 'Due', type: 'date', defaultValue: '', description: '' },
      },
    });
    useVariablesSuggestionsStore.setState({
      byNodeId: {
        [nodeId]: {
          type: SUGGESTION_NODE_TYPE.CUSTOM,
          bySourceHandle: {
            success: [
              { id: `nodes.${nodeId}.payload`, display: 'payload', label: 'payload', type: 'object' },
              { id: `nodes.${nodeId}.items`, display: 'items', label: 'items', type: 'array' },
              { id: `nodes.${nodeId}.count`, display: 'count', label: 'count', type: 'number' },
            ],
          },
        },
      },
    });
  });

  it.each(['21', '3.5', '-1', '0', ' 7 '])('returns number for a numeric literal: %j', (value) => {
    expect(getStringVariableTypeIfPossible(value)).toBe('number');
  });

  it.each([undefined, '', '   ', 'abc', '12abc', '{{global.missing}}', '{{nodes.other.count}}'])(
    'falls back to string for an unresolvable value: %j',
    (value) => {
      expect(getStringVariableTypeIfPossible(value)).toBe('string');
    },
  );

  it.each([
    ['{{global.total}}', 'number'],
    ['global.total', 'number'],
    ['{{global.name}}', 'string'],
    ['{{global.active}}', 'boolean'],
    ['{{global.due}}', 'date'],
    [`{{nodes.${nodeId}.count}}`, 'number'],
  ])('returns the primitive type of a resolved reference: %j → %s', (value, expected) => {
    expect(getStringVariableTypeIfPossible(value)).toBe(expected);
  });

  it.each([`{{nodes.${nodeId}.payload}}`, `{{nodes.${nodeId}.items}}`])(
    'falls back to string for a reference with a complex type: %j',
    (value) => {
      expect(getStringVariableTypeIfPossible(value)).toBe('string');
    },
  );
});

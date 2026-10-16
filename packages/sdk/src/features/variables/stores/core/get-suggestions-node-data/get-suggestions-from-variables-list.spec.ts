import { describe, expect, it } from 'vitest';

import type { VariableInListWithReference } from '../../../../json-form/controls/variables-list-control/types';
import { getSuggestionsFromVariablesList } from './get-suggestions-from-variables-list';

const variablesList: VariableInListWithReference[] = [
  { label: 'Amount', reference: '{{ nodes.node-1.amount }}', type: 'number' },
  { label: 'Customer', reference: '{{ nodes.node-1.customer }}', type: 'string' },
];

const params = { variablesList, nodeId: 'node-2', nodeLabel: 'Review', propertyPath: 'editableFields' };

describe('getSuggestionsFromVariablesList', () => {
  it('should reference each entry by its index under the node properties path', () => {
    const ids = getSuggestionsFromVariablesList(params).map(({ id }) => id);

    expect(ids).toEqual(['nodes.node-2.properties.editableFields.0', 'nodes.node-2.properties.editableFields.1']);
  });

  it('should keep the entry label and type', () => {
    expect(getSuggestionsFromVariablesList(params)).toEqual([
      expect.objectContaining({ label: 'Amount', type: 'number' }),
      expect.objectContaining({ label: 'Customer', type: 'string' }),
    ]);
  });

  it('should display the node label joined with the entry label', () => {
    const [first] = getSuggestionsFromVariablesList(params);

    expect(first.display).toBe('Review · Amount');
  });

  it('should truncate long node and entry labels in display', () => {
    const [first] = getSuggestionsFromVariablesList({
      ...params,
      nodeLabel: 'A very long node label',
      variablesList: [{ ...variablesList[0], label: 'A very long entry label' }],
    });

    expect(first.display).toBe('A very long nod... · A very long ent...');
  });

  it('should skip an empty node label in display', () => {
    const [first] = getSuggestionsFromVariablesList({ ...params, nodeLabel: '' });

    expect(first.display).toBe('Amount');
  });

  it('should support nested property paths', () => {
    const [first] = getSuggestionsFromVariablesList({ ...params, propertyPath: 'form.fields' });

    expect(first.id).toBe('nodes.node-2.properties.form.fields.0');
  });

  it('should return an empty list for an empty input', () => {
    expect(getSuggestionsFromVariablesList({ ...params, variablesList: [] })).toEqual([]);
  });
});

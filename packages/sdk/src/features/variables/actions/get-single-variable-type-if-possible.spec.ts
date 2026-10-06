import { beforeEach, describe, expect, it } from 'vitest';

import { resetWorkflowStore, useStore } from '../../../store/store';
import { getSingleVariableTypeIfPossible } from './get-single-variable-type-if-possible';

describe('getSingleVariableTypeIfPossible', () => {
  beforeEach(() => {
    resetWorkflowStore();
    useStore.setState({
      globalVariables: {
        total: { id: 'total', name: 'Total amount', type: 'number', defaultValue: '0', description: '' },
        customerName: { id: 'customerName', name: 'Customer name', type: 'string', defaultValue: '', description: '' },
      },
    });
  });

  it.each(['{{global.total}}', 'global.total', '  {{global.total}}  '])('returns number for %j', (value) => {
    expect(getSingleVariableTypeIfPossible(value)).toBe('number');
  });

  it.each(['{{global.customerName}}', 'global.customerName'])('returns string for %j', (value) => {
    expect(getSingleVariableTypeIfPossible(value)).toBe('string');
  });

  it.each([undefined, '', 'plain text', '{{global.total}} {{global.total}}', '{{global.missing}}', '{{nodes.x.y}}'])(
    'returns undefined when the value cannot be resolved: %j',
    (value) => {
      expect(getSingleVariableTypeIfPossible(value)).toBeUndefined();
    },
  );
});

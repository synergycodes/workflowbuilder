import { describe, expect, it } from 'vitest';

import type { VariableInListWithReference } from '../../../json-form/controls/variables-list-control/types';
import { getVariablesListIfValid } from './get-variables-list-if-valid';

const variable: VariableInListWithReference = {
  label: 'Amount',
  reference: '{{ nodes.node-1.amount }}',
  type: 'number',
};

describe('getVariablesListIfValid', () => {
  it('should return the list when every entry is a variable with a reference', () => {
    const list: VariableInListWithReference[] = [
      variable,
      { label: 'Customer', reference: '{{ nodes.node-1.customer }}', type: 'string' },
    ];

    expect(getVariablesListIfValid(list)).toBe(list);
  });

  it('should accept entries with an empty label or reference', () => {
    const list = [{ label: '', reference: '', type: 'string' }];

    expect(getVariablesListIfValid(list)).toBe(list);
  });

  it('should accept entries with extra properties', () => {
    const list = [{ ...variable, extra: true }];

    expect(getVariablesListIfValid(list)).toBe(list);
  });

  it.each(['string', 'number', 'boolean', 'datetime', 'date', 'object', 'array'] as const)(
    'should accept %s type',
    (type) => {
      const list = [{ ...variable, type }];

      expect(getVariablesListIfValid(list)).toBe(list);
    },
  );

  it('should reject an empty list', () => {
    expect(getVariablesListIfValid([])).toBeUndefined();
  });

  it('should reject non-array values', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(getVariablesListIfValid(undefined)).toBeUndefined();
    expect(getVariablesListIfValid(null)).toBeUndefined();
    expect(getVariablesListIfValid(variable.reference)).toBeUndefined();
    expect(getVariablesListIfValid(1)).toBeUndefined();
    expect(getVariablesListIfValid(variable)).toBeUndefined();
    expect(getVariablesListIfValid({ 'var-1': variable })).toBeUndefined();
  });

  it('should reject entries that are not objects', () => {
    expect(getVariablesListIfValid([null])).toBeUndefined();
    expect(getVariablesListIfValid([variable.reference])).toBeUndefined();
    expect(getVariablesListIfValid([[variable]])).toBeUndefined();
    expect(getVariablesListIfValid([variable, undefined])).toBeUndefined();
  });

  it('should reject entries missing reference', () => {
    const { reference: _reference, ...withoutReference } = variable;

    expect(getVariablesListIfValid([withoutReference])).toBeUndefined();
    expect(getVariablesListIfValid([{ ...variable, reference: 1 }])).toBeUndefined();
    expect(getVariablesListIfValid([{ ...variable, reference: null }])).toBeUndefined();
  });

  it('should reject entries missing label', () => {
    const { label: _label, ...withoutLabel } = variable;

    expect(getVariablesListIfValid([withoutLabel])).toBeUndefined();
    expect(getVariablesListIfValid([{ ...variable, label: 1 }])).toBeUndefined();
  });

  it('should reject entries with a missing or unsupported type', () => {
    const { type: _type, ...withoutType } = variable;

    expect(getVariablesListIfValid([withoutType])).toBeUndefined();
    expect(getVariablesListIfValid([{ ...variable, type: 'integer' }])).toBeUndefined();
    expect(getVariablesListIfValid([{ ...variable, type: 'String' }])).toBeUndefined();
    expect(getVariablesListIfValid([{ ...variable, type: null }])).toBeUndefined();
  });

  it('should reject the whole list when a single entry is invalid', () => {
    const list = [variable, { ...variable, reference: undefined }];

    expect(getVariablesListIfValid(list)).toBeUndefined();
  });
});

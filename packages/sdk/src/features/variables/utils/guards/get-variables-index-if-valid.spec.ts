import { describe, expect, it } from 'vitest';

import type { VariableDefinition, VariablesIndex } from '../../types';
import { getVariablesIndexIfValid } from './get-variables-index-if-valid';

const definition: VariableDefinition = {
  id: 'var-1',
  name: 'First',
  type: 'string',
  defaultValue: '',
  description: '',
};

describe('getVariablesIndexIfValid', () => {
  it('should return the index when every entry is a variable definition', () => {
    const index: VariablesIndex = {
      [definition.id]: definition,
      'var-2': { ...definition, id: 'var-2', type: 'number' },
    };

    expect(getVariablesIndexIfValid(index)).toBe(index);
  });

  it('should accept an empty index', () => {
    const index = {};

    expect(getVariablesIndexIfValid(index)).toBe(index);
  });

  it('should accept undefined entries', () => {
    const index = { 'var-1': definition, 'var-2': undefined };

    expect(getVariablesIndexIfValid(index)).toBe(index);
  });

  it('should accept entries with extra properties', () => {
    const index = { 'var-1': { ...definition, extra: true } };

    expect(getVariablesIndexIfValid(index)).toBe(index);
  });

  it.each(['string', 'number', 'boolean', 'datetime', 'date'] as const)('should accept %s type', (type) => {
    const index = { 'var-1': { ...definition, type } };

    expect(getVariablesIndexIfValid(index)).toBe(index);
  });

  it('should reject non-object values', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(getVariablesIndexIfValid(undefined)).toBeUndefined();
    expect(getVariablesIndexIfValid(null)).toBeUndefined();
    expect(getVariablesIndexIfValid('var-1')).toBeUndefined();
    expect(getVariablesIndexIfValid(1)).toBeUndefined();
    expect(getVariablesIndexIfValid([definition])).toBeUndefined();
  });

  it('should reject entries that are not objects', () => {
    expect(getVariablesIndexIfValid({ 'var-1': null })).toBeUndefined();
    expect(getVariablesIndexIfValid({ 'var-1': 'First' })).toBeUndefined();
    expect(getVariablesIndexIfValid({ 'var-1': [definition] })).toBeUndefined();
  });

  it('should reject entries missing id or name', () => {
    const { id: _id, ...withoutId } = definition;
    const { name: _name, ...withoutName } = definition;

    expect(getVariablesIndexIfValid({ 'var-1': withoutId })).toBeUndefined();
    expect(getVariablesIndexIfValid({ 'var-1': withoutName })).toBeUndefined();
    expect(getVariablesIndexIfValid({ 'var-1': { ...definition, id: 1 } })).toBeUndefined();
    expect(getVariablesIndexIfValid({ 'var-1': { ...definition, name: null } })).toBeUndefined();
  });

  it('should reject entries with a missing or unsupported type', () => {
    const { type: _type, ...withoutType } = definition;

    expect(getVariablesIndexIfValid({ 'var-1': withoutType })).toBeUndefined();
    expect(getVariablesIndexIfValid({ 'var-1': { ...definition, type: 'integer' } })).toBeUndefined();
    expect(getVariablesIndexIfValid({ 'var-1': { ...definition, type: 'String' } })).toBeUndefined();
  });

  it('should reject non-primitive types', () => {
    expect(getVariablesIndexIfValid({ 'var-1': { ...definition, type: 'object' } })).toBeUndefined();
    expect(getVariablesIndexIfValid({ 'var-1': { ...definition, type: 'array' } })).toBeUndefined();
  });

  it('should reject the whole index when a single entry is invalid', () => {
    const index = { 'var-1': definition, 'var-2': { ...definition, id: 'var-2', type: 'nope' } };

    expect(getVariablesIndexIfValid(index)).toBeUndefined();
  });
});

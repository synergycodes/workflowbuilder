import { describe, expect, it } from 'vitest';

import type { VariableType } from '../../../../node/node-output-schema';
import { getIsSupportedVariableType } from './get-is-supported-variable-type';

const supportedTypes: VariableType[] = ['string', 'number', 'boolean', 'datetime', 'date', 'object', 'array'];

describe('getIsSupportedVariableType', () => {
  it.each(supportedTypes)('should accept %s', (type) => {
    expect(getIsSupportedVariableType(type)).toBe(true);
  });

  it('should reject json schema types outside VariableType', () => {
    expect(getIsSupportedVariableType('integer')).toBe(false);
    expect(getIsSupportedVariableType('null')).toBe(false);
  });

  it('should reject unknown strings', () => {
    expect(getIsSupportedVariableType('')).toBe(false);
    expect(getIsSupportedVariableType('String')).toBe(false);
    expect(getIsSupportedVariableType('str')).toBe(false);
  });

  it('should reject Object.prototype keys', () => {
    expect(getIsSupportedVariableType('toString')).toBe(false);
    expect(getIsSupportedVariableType('constructor')).toBe(false);
    expect(getIsSupportedVariableType('hasOwnProperty')).toBe(false);
  });

  it('should reject non-string values', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(getIsSupportedVariableType(undefined)).toBe(false);
    expect(getIsSupportedVariableType(null)).toBe(false);
    expect(getIsSupportedVariableType(['string'])).toBe(false);
    expect(getIsSupportedVariableType(1)).toBe(false);
    expect(getIsSupportedVariableType({ type: 'string' })).toBe(false);
  });

  it('should narrow the type', () => {
    const type: unknown = 'string';

    if (getIsSupportedVariableType(type)) {
      const narrowed: VariableType = type;

      expect(narrowed).toBe('string');
    } else {
      expect.unreachable();
    }
  });
});

import { describe, expect, it } from 'vitest';

import { SOURCE_HANDLE_TYPE } from '../../constants';
import type { SourceHandleType } from '../../constants';
import { getIsSourceHandleType } from './get-is-source-handle-type';

describe('getIsSourceHandleType', () => {
  it.each(Object.values(SOURCE_HANDLE_TYPE))('should accept %s', (type) => {
    expect(getIsSourceHandleType(type)).toBe(true);
  });

  it('should reject the retired every keyword', () => {
    expect(getIsSourceHandleType('every')).toBe(false);
  });

  it('should reject handle names that only contain a type', () => {
    expect(getIsSourceHandleType('onError')).toBe(false);
    expect(getIsSourceHandleType('error-1')).toBe(false);
    expect(getIsSourceHandleType('success ')).toBe(false);
  });

  it('should reject different casing', () => {
    expect(getIsSourceHandleType('Success')).toBe(false);
    expect(getIsSourceHandleType('ERROR')).toBe(false);
  });

  it('should reject unknown strings', () => {
    expect(getIsSourceHandleType('')).toBe(false);
    expect(getIsSourceHandleType('default')).toBe(false);
    expect(getIsSourceHandleType('output')).toBe(false);
  });

  it('should reject Object.prototype keys', () => {
    expect(getIsSourceHandleType('toString')).toBe(false);
    expect(getIsSourceHandleType('constructor')).toBe(false);
    expect(getIsSourceHandleType('hasOwnProperty')).toBe(false);
  });

  it('should reject non-string values', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(getIsSourceHandleType(undefined)).toBe(false);
    expect(getIsSourceHandleType(null)).toBe(false);
    expect(getIsSourceHandleType(['success'])).toBe(false);
    expect(getIsSourceHandleType(1)).toBe(false);
    expect(getIsSourceHandleType({ type: 'success' })).toBe(false);
  });

  it('should narrow the type', () => {
    const value: unknown = 'success';

    if (getIsSourceHandleType(value)) {
      const narrowed: SourceHandleType = value;

      expect(narrowed).toBe(SOURCE_HANDLE_TYPE.SUCCESS);
    } else {
      expect.unreachable();
    }
  });
});

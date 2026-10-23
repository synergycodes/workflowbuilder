import { describe, expect, it } from 'vitest';

import type { VariableType, VariableTypePrimitive } from '@workflow-builder/types/variables';

import { getVariableTypeIfPrimitive } from './get-variable-type-if-primitive';

const primitiveTypes: VariableTypePrimitive[] = ['string', 'number', 'boolean', 'datetime', 'date'];
const compositeTypes: VariableType[] = ['object', 'array'];

describe('getVariableTypeIfPrimitive', () => {
  it.each(primitiveTypes)('should return %s unchanged', (type) => {
    expect(getVariableTypeIfPrimitive(type)).toBe(type);
  });

  it.each(compositeTypes)('should return undefined for %s', (type) => {
    expect(getVariableTypeIfPrimitive(type)).toBeUndefined();
  });

  it('should narrow the type', () => {
    const type: VariableType = 'number';
    const primitive = getVariableTypeIfPrimitive(type);

    if (primitive) {
      const narrowed: VariableTypePrimitive = primitive;

      expect(narrowed).toBe('number');
    } else {
      expect.unreachable();
    }
  });
});

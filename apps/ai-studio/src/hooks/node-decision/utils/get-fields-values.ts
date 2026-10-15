import type { DecisionField } from '../types';

type PrimitiveValue = string | number | boolean;

function isPrimitiveValue(value: unknown): value is PrimitiveValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

export function getFieldsValues(fields: DecisionField[]): Record<string, PrimitiveValue> {
  return Object.fromEntries(
    fields.flatMap(({ reference, value }): [string, PrimitiveValue][] =>
      isPrimitiveValue(value) ? [[reference, value]] : [],
    ),
  );
}

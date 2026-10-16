import type { DecisionField } from '../types';
import { getFieldKey } from './get-field-key';

type PrimitiveValue = string | number | boolean;

function isPrimitiveValue(value: unknown): value is PrimitiveValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/** The fields' primitive values keyed by {@link getFieldKey}; a field without one starts the form empty. */
export function getFieldsValues(fields: DecisionField[]): Record<string, PrimitiveValue> {
  return Object.fromEntries(
    fields.flatMap(({ reference, value }): [string, PrimitiveValue][] => {
      const key = getFieldKey(reference);
      return key !== undefined && isPrimitiveValue(value) ? [[key, value]] : [];
    }),
  );
}

import type { JsonSchema } from '@jsonforms/core';

import type { DecisionField } from '../types';
import { getFieldKey } from './get-field-key';

type SchemaType = 'string' | 'number' | 'boolean';

// A date travels as text and the editor has no date control, so it is edited as text.
const SCHEMA_TYPE_BY_FIELD_TYPE = new Map<string, SchemaType>([
  ['string', 'string'],
  ['number', 'number'],
  ['boolean', 'boolean'],
  ['date', 'string'],
  ['datetime', 'string'],
]);

/**
 * One required property per field the editor can show, keyed by {@link getFieldKey}; any other field is left out.
 * Must stay equal to `editableFieldsSchema` in the backend's editable-fields-schema.ts; the parity test checks it.
 */
export function getFieldsSchema(fields: DecisionField[]): JsonSchema {
  const properties = Object.fromEntries(
    fields.flatMap((field): [string, { type: SchemaType; title: string }][] => {
      const key = getFieldKey(field.reference);
      const type = SCHEMA_TYPE_BY_FIELD_TYPE.get(field.type);
      return key === undefined || type === undefined ? [] : [[key, { type, title: field.label }]];
    }),
  );

  return { type: 'object', properties, required: Object.keys(properties) };
}

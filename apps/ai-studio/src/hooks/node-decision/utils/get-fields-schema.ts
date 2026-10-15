import type { JsonSchema } from '@jsonforms/core';

import type { DecisionField } from '../types';

const PRIMITIVE_TYPES = ['string', 'number', 'boolean'] as const;

type PrimitiveType = (typeof PRIMITIVE_TYPES)[number];

function isPrimitiveType(type: string): type is PrimitiveType {
  return (PRIMITIVE_TYPES as readonly string[]).includes(type);
}

export function getFieldsSchema(fields: DecisionField[]): JsonSchema {
  const primitiveFields = fields.filter((field) => isPrimitiveType(field.type));

  const properties = Object.fromEntries(
    primitiveFields.map((field) => [field.reference, { type: field.type, title: field.label }]),
  );

  return {
    type: 'object',
    properties,
    required: primitiveFields.map((field) => field.reference),
  };
}

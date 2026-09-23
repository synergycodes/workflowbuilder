import type { JsonSchema } from '@workflowbuilder/sdk';

import { isPlainObject } from '../../utils/is-plain-object';

/** A form schema the editor can render: an object whose `properties` are the fields. */
export function isFormSchema(value: unknown): value is JsonSchema {
  return isPlainObject(value) && isPlainObject(value['properties']);
}

/** Each declared field of an object schema, with its declaration; anything else declares none. */
export function schemaFields(schema: unknown): [string, Record<string, unknown>][] {
  const properties = isPlainObject(schema) && isPlainObject(schema['properties']) ? schema['properties'] : {};
  return Object.entries(properties).flatMap(([key, field]): [string, Record<string, unknown>][] =>
    isPlainObject(field) ? [[key, field]] : [],
  );
}

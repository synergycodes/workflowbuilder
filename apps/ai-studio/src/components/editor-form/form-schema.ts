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

export function encodePointerSegment(key: string): string {
  return key.replaceAll('~', '~0').replaceAll('/', '~1');
}

export function decodePointerSegment(segment: string): string {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~');
}

type SchemaError = { instancePath: string; params: Record<string, unknown> };

/** The top-level fields a set of validation errors is about. */
export function invalidFieldsOf(errors?: readonly SchemaError[]): ReadonlySet<string> {
  const fields = new Set<string>();
  for (const error of errors ?? []) {
    const [, segment] = error.instancePath.split('/');
    const missing = error.params['missingProperty'];
    // A field's own error points into it; a missing required field is reported on the object that holds it.
    if (segment !== undefined) {
      fields.add(decodePointerSegment(segment));
    } else if (typeof missing === 'string') {
      fields.add(missing);
    }
  }
  return fields;
}

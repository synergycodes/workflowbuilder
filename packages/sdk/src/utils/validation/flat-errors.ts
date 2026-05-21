import type { ErrorObject } from 'ajv';

import type { FlatError } from '../../node/node-schema';

export function flatErrors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: ErrorObject<string, Record<string, any>, unknown>[] | undefined | null,
): FlatError[] {
  return errors
    ? errors.map((error) => ({
        keyword: error.keyword,
        instancePath: error.instancePath,
        schemaPath: error.schemaPath,
        schema: error.schema as string[],
        message: error.message,
      }))
    : [];
}

import { FlatError } from '@workflow-builder/types/node-schema';
import { ErrorObject } from 'ajv';

export function flatErrors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: ErrorObject<string, Record<string, any>, unknown>[] | undefined | null,
): FlatError[] {
  return errors
    ? errors.map((error) => ({
        keyword: error.keyword,
        instancePath: error.instancePath,
        schemaPath: error.schemaPath,
        message: error.message,
      }))
    : [];
}

import { ErrorObject } from 'ajv';

import { FlatError } from '@workflow-builder/types/node-schema';

export function getIsValidFromProperties(properties: unknown): boolean | undefined {
  if (!properties) {
    return;
  }

  const errors = (properties as { errors: FlatError[] })?.errors || [];
  const customErrors = (properties as { customErrors: ErrorObject[] })?.customErrors || [];

  return errors.length === 0 && customErrors.length === 0;
}

import type { JsonSchema7 } from '@jsonforms/core';

const getIsPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getIsStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
};

const getIsOptionalString = (value: unknown): value is string | undefined => {
  return value === undefined || typeof value === 'string';
};

const getIsJsonSchema = (value: unknown): value is JsonSchema7 => {
  if (!getIsPlainObject(value)) {
    return false;
  }

  const { type, title, description, format, required, properties, items } = value;

  if (type !== undefined && typeof type !== 'string' && !getIsStringArray(type)) {
    return false;
  }

  if (!getIsOptionalString(title) || !getIsOptionalString(description) || !getIsOptionalString(format)) {
    return false;
  }

  if (required !== undefined && !getIsStringArray(required)) {
    return false;
  }

  if (properties !== undefined) {
    if (!getIsPlainObject(properties)) {
      return false;
    }

    if (!Object.values(properties).every(getIsJsonSchema)) {
      return false;
    }
  }

  if (items !== undefined) {
    const itemSchemas = Array.isArray(items) ? items : [items];

    if (!itemSchemas.every(getIsJsonSchema)) {
      return false;
    }
  }

  return true;
};

/**
 * Narrows a value read from node data. Checks only the keywords the variables feature reads (`type`, `title`, `description`, `format`, `required`, `properties`, `items`), recursively; other keywords pass through untouched.
 */
export const getJsonSchemaIfValid = (maybeJsonSchema: unknown): JsonSchema7 | undefined => {
  return getIsJsonSchema(maybeJsonSchema) ? maybeJsonSchema : undefined;
};

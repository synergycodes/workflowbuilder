import type { OutputUnit, Schema, ValidationResult } from '@cfworker/json-schema';

import { getIsStringVariableReference } from '../../../features/variables/utils/keys/get-is-string-variable-reference';
import { isPlainObject } from '../../object';
import { getDateYYYYMMDD, getTimeHHmm } from '../../time-iso';

export type CustomType = 'datetime' | 'date' | 'time';

/** One picker-typed property, addressed from the form root (`['timeSchedule', 'starts', 'time']`). */
export type CustomTypeField = {
  path: readonly string[];
  type: CustomType;
};

type SchemaProperties = Exclude<Schema['properties'], undefined>;

type SplitSchema = {
  /** The schema with every custom-typed property removed, at any object depth. */
  standardSchema: Schema;
  customFields: CustomTypeField[];
};

const CUSTOM_TYPES: Record<CustomType, true> = { datetime: true, date: true, time: true };

/** The non-JSON-Schema property types the editor's pickers write; `@cfworker/json-schema` fails every value of them. */
export const getIsCustomType = (type: unknown): type is CustomType =>
  typeof type === 'string' && Object.hasOwn(CUSTOM_TYPES, type);

// `YYYY-MM-DD` ahead of anything else: `new Date('5')` alone would accept a stray digit as a year.
const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

const getIsValidValue = (type: CustomType, value: string): boolean =>
  type === 'time' ? getTimeHHmm(value) !== undefined : DATE_PREFIX.test(value) && getDateYYYYMMDD(value) !== undefined;

function splitProperties(
  properties: SchemaProperties,
  path: readonly string[],
): SplitSchema & { properties: SchemaProperties } {
  const standard: SchemaProperties = {};
  const customFields: CustomTypeField[] = [];

  for (const [name, declaration] of Object.entries(properties)) {
    const fieldPath = [...path, name];

    if (typeof declaration !== 'boolean' && getIsCustomType(declaration.type)) {
      customFields.push({ path: fieldPath, type: declaration.type });
      continue;
    }

    if (typeof declaration !== 'boolean' && declaration.type === 'object' && declaration.properties) {
      const nested = splitProperties(declaration.properties, fieldPath);

      standard[name] = { ...declaration, properties: nested.properties };
      customFields.push(...nested.customFields);
      continue;
    }

    standard[name] = declaration;
  }

  return { standardSchema: {}, properties: standard, customFields };
}

/**
 * Takes the `date` / `datetime` / `time` properties out of the schema before `@cfworker/json-schema` sees it.
 * Nested objects are walked like the blank-text rule does; array items are left to their controls.
 * `required` stays where it is, so a missing custom-typed property is still the standard validator's to report.
 */
export function splitCustomTypes(schema: Schema): SplitSchema {
  if (!schema.properties) {
    return { standardSchema: schema, customFields: [] };
  }

  const { properties, customFields } = splitProperties(schema.properties, []);

  return { standardSchema: { ...schema, properties }, customFields };
}

function getValueAtPath(data: unknown, path: readonly string[]): unknown {
  let current = data;

  for (const segment of path) {
    if (!isPlainObject(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

// Same encoding as @cfworker/json-schema (not exported), so `mapOutputToErrorObjects` decodes both alike.
const encodePointerSegment = (segment: string) => encodeURI(segment.replaceAll('~', '~0').replaceAll('/', '~1'));

/**
 * Validates the custom-typed properties `splitCustomTypes` took out of the schema.
 * A present value passes as a date string (`HH:mm` for `time`) or as a single variable reference; a missing
 * one is the standard schema's `required` to report. See variable-references-and-date-types.decision-log.md § 2.
 */
export function getValidationForCustomTypes(fields: readonly CustomTypeField[]): (data: unknown) => ValidationResult {
  return (data: unknown) => {
    const errors: OutputUnit[] = [];

    if (!isPlainObject(data)) {
      return { valid: true, errors };
    }

    for (const { path, type } of fields) {
      const value = getValueAtPath(data, path);

      if (value === undefined) {
        continue;
      }

      const isValid =
        typeof value === 'string' && (getIsStringVariableReference(value) || getIsValidValue(type, value));

      if (!isValid) {
        errors.push({
          error: `Instance does not match type "${type}".`,
          instanceLocation: `#/${path.map(encodePointerSegment).join('/')}`,
          keyword: 'type',
          keywordLocation: `#/properties/${path.map(encodePointerSegment).join('/properties/')}/type`,
        });
      }
    }

    return { valid: errors.length === 0, errors };
  };
}

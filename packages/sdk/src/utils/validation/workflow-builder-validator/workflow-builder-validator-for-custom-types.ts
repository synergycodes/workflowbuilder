import type { OutputUnit, Schema, ValidationResult } from '@cfworker/json-schema';

import { getIsStringVariableReference } from '../../../features/variables/utils/keys/get-is-string-variable-reference';
import { isPlainObject } from '../../object';
import { getDateYYYYMMDD, getTimeHHmm } from '../../time-iso';

export type CustomType = 'datetime' | 'date' | 'time';

const CUSTOM_TYPES: Record<CustomType, true> = { datetime: true, date: true, time: true };

/** The non-JSON-Schema property types the editor's pickers write; `@cfworker/json-schema` fails every value of them. */
export const getIsCustomType = (type: unknown): type is CustomType =>
  typeof type === 'string' && Object.hasOwn(CUSTOM_TYPES, type);

// `YYYY-MM-DD` ahead of anything else: `new Date('5')` alone would accept a stray digit as a year.
const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

const getIsValidValue = (type: CustomType, value: string): boolean =>
  type === 'time' ? getTimeHHmm(value) !== undefined : DATE_PREFIX.test(value) && getDateYYYYMMDD(value) !== undefined;

/**
 * Validates the `date` / `datetime` / `time` properties the main validator splits out of the schema.
 * A present value passes as a date string (`HH:mm` for `time`) or as a single variable reference; a missing
 * one is the standard schema's `required` to report. See variable-references-and-date-types.decision-log.md § 2.
 */
export function getValidationForCustomTypes(
  properties: Exclude<Schema['properties'], undefined>,
): (data: unknown) => ValidationResult {
  const fields = Object.entries(properties).flatMap(([name, declaration]) =>
    typeof declaration !== 'boolean' && getIsCustomType(declaration.type) ? [[name, declaration.type] as const] : [],
  );

  return (data: unknown) => {
    const errors: OutputUnit[] = [];

    if (!isPlainObject(data)) {
      return { valid: true, errors };
    }

    for (const [name, type] of fields) {
      const value = data[name];

      if (value === undefined) {
        continue;
      }

      const isValid =
        typeof value === 'string' && (getIsStringVariableReference(value) || getIsValidValue(type, value));

      if (!isValid) {
        errors.push({
          error: `Instance does not match type "${type}".`,
          instanceLocation: `#/${name}`,
          keyword: 'type',
          keywordLocation: `#/properties/${name}/type`,
        });
      }
    }

    return { valid: errors.length === 0, errors };
  };
}

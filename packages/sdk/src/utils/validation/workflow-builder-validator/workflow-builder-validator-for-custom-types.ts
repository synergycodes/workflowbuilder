import type { OutputUnit, Schema } from '@cfworker/json-schema';

import { getIsStringVariableReference } from '../../../features/variables/utils/keys/get-is-string-variable-reference';
import { getTimeHHmm } from '../../time-iso';
import { getIsValidDate } from '../get-is-valid-date';

type CustomSchema = {
  type: 'datetime' | 'date' | 'time';
};

/**
 * Validates the non-JSON-Schema `date` / `datetime` / `time` properties the main validator splits out.
 * A value passes as a valid date string (`HH:mm` for `time`) or a single variable reference.
 * See variable-references-and-date-types.decision-log.md § 2.
 */
export function getValidationForCustomTypes(schema: Schema): (data: unknown) => {
  valid: boolean;
  errors: OutputUnit[];
} {
  const errors: OutputUnit[] = [];
  const customFieldsToValidate = Array.isArray(schema.properties) ? Object.entries(schema.properties) : [];

  return (data: unknown) => {
    for (const [propertyName, propertyValue] of customFieldsToValidate) {
      const isRequiredByEmpty = (schema.required || []).includes(propertyName);
      if (isRequiredByEmpty) {
        errors.push({
          error: `Instance does not have required property "${propertyName}".`,
          instanceLocation: '#',
          keyword: 'required',
          keywordLocation: '#/required',
        });

        continue;
      }

      if (typeof propertyValue !== 'object') {
        continue;
      }

      const fieldSchema = propertyValue as unknown as CustomSchema;

      if (typeof fieldSchema.type !== 'string') {
        errors.push({
          error: `Instance does not have required type "${propertyName}".`,
          instanceLocation: '#',
          keyword: 'missing-type',
          keywordLocation: '#/missing-type',
        });

        continue;
      }

      if (!data || data === null) {
        errors.push({
          error: `Instance does not have required property "${propertyName}".`,
          instanceLocation: '#',
          keyword: 'required',
          keywordLocation: '#/required',
        });
      }

      if (['date', 'datetime', 'time'].includes(fieldSchema.type)) {
        const value = (data as Record<string, unknown>)[propertyName];
        if (typeof value !== 'string') {
          errors.push({
            error: `Instance does not have required property "${propertyName}".`,
            instanceLocation: '#',
            keyword: 'required',
            keywordLocation: '#/required',
          });

          continue;
        }

        const isSingleVariable = getIsStringVariableReference(value);
        const isValidValue = fieldSchema.type === 'time' ? getTimeHHmm(value) !== undefined : getIsValidDate(value);
        if (!isSingleVariable && !isValidValue) {
          errors.push({
            error: `Instance does not have required property "${propertyName}".`,
            instanceLocation: '#',
            keyword: 'required',
            keywordLocation: '#/required',
          });
        }
      }
    }

    return {
      valid: false,
      errors: [],
    };
  };
}

import type { ValidationResult } from '@cfworker/json-schema';

import { getIsStringVariableReference } from '../../../../features/variables/utils/keys/get-is-string-variable-reference';
import { getByPath } from '../../../object';
import { removeErrorFromErrorsList } from './remove-property-error-from-error-list';

type Params = {
  result: ValidationResult;
  // From form;
  data: unknown;
};

/**
 * Strips schema errors whose value is a whole-string variable reference (`{{global.email}}`):
 * the real value is known only at run time, so the engine, not the form, judges it.
 * Mutates `result`. Scope and limits: variable-references-and-date-types.decision-log.md § 1.
 */
export function removeReferenceIsStringErrors({ result, data }: Params): ValidationResult {
  if (result.valid) {
    return result;
  }

  for (const [propertyName, value] of Object.entries(data || {})) {
    if (typeof value === 'string') {
      const isSingleVariable = getIsStringVariableReference(value);

      if (isSingleVariable) {
        result.errors = removeErrorFromErrorsList({ errors: result.errors, propertyName, mode: 'exact' });
      }
    }

    if (Array.isArray(value) && value.length > 0) {
      const allArrayErrors = result.errors.filter((error) => error.instanceLocation.startsWith(`#/${propertyName}`));

      if (allArrayErrors.length > 0) {
        const isArrayOfStrings = value.every((item) => typeof item === 'string');

        // Arrays of objects stay untouched: the control cannot yet map an error to its item.
        if (isArrayOfStrings) {
          const allValuesArrayErrors = allArrayErrors
            .map((error) => {
              const match = error.instanceLocation.match(new RegExp(`^#/${propertyName}/(\\d+)`));
              return match ? { error, index: Number(match[1]) } : null;
            })
            .filter((item): item is { error: (typeof allArrayErrors)[number]; index: number } => item !== null);

          if (allValuesArrayErrors.length > 0) {
            const areAllErrorValuesSingleVariable = allValuesArrayErrors.every(({ index }) =>
              getIsStringVariableReference(value[index]),
            );
            if (areAllErrorValuesSingleVariable) {
              result.errors = removeErrorFromErrorsList({ errors: result.errors, propertyName, mode: 'all' });
            }
          }
        }
      }
    }

    if (Array.isArray(value) === false && typeof value === 'object' && value !== null) {
      const allObjectErrors = result.errors.filter((error) => error.instanceLocation.startsWith(`#/${propertyName}`));

      if (allObjectErrors.length > 0) {
        const areAllErrorValuesSingleVariable = allObjectErrors.every((error) => {
          const isErrorAboutPropertiesInNestedObject = error.keyword === 'properties';
          if (isErrorAboutPropertiesInNestedObject) {
            return true;
          }

          const isTypeError = error.keyword === 'type';
          if (isTypeError) {
            const objectPath = error.instanceLocation.split(`${propertyName}/`).at(-1)?.replaceAll('/', '.');

            if (!objectPath) {
              return false;
            }
            const propertyValue = getByPath(value, objectPath);

            return typeof propertyValue === 'string' && getIsStringVariableReference(propertyValue);
          }

          return false;
        });

        if (areAllErrorValuesSingleVariable) {
          result.errors = removeErrorFromErrorsList({ errors: result.errors, propertyName, mode: 'all' });
        }
      }
    }
  }

  if (result.errors.length > 0) {
    // With the detailed errors gone, `allOf` / `if` leave only "does not match subschema" behind.
    const areAllErrorsLeftMetaErrors = result.errors.every((error) => ['allOf', 'if'].includes(error.keyword));
    if (areAllErrorsLeftMetaErrors) {
      result.errors = [];
    }
  }

  if (result.errors.length === 0) {
    result.valid = true;
  }

  return result;
}

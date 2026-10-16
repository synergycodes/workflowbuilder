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
 * Strips JSON Schema errors caused by variable references used in place of literal values.
 *
 * Why: form fields may hold a reference like `{{global.email}}` instead of a real value.
 * The schema still says `format: 'email'`, `type: 'number'`, `minimum: 1`, etc., so the validator
 * reports a type/format error for the placeholder string. Those errors are false positives:
 * the control has already checked that the reference itself is valid, and the real value is only
 * known at execution time (the engine is responsible for rejecting/clamping it then).
 *
 * What is handled (top-level properties only, nested paths are not supported yet):
 * - string property that is exactly one reference -> errors pointing at that property are removed;
 * - array of strings where every failing item is a reference -> all errors for that property are removed;
 * - arrays of objects are left untouched (needs per-item error mapping in the control);
 * - conditional schemas (`allOf` / `if`): once detailed errors are gone only the generic
 *   "does not match subschema" errors remain, so they are dropped too.
 *
 * Mutates and returns the given `result`; sets `valid` to `true` when no errors are left.
 */
export function removeReferenceIsStringErrors({ result, data }: Params): ValidationResult {
  if (result.valid) {
    return result;
  }

  for (const [propertyName, value] of Object.entries(data || {})) {
    if (typeof value === 'string') {
      const isSingleVariable = getIsStringVariableReference(value);

      /*
        The default validator expects an email or a number, but instead receives a string with a reference to a variable,
        such as {{global.variable}}. In such cases, we remove the error, trusting that the control has already ensured the variable is valid.

        But we often cannot know the actual value at validation time. For example, we may receive a variable that contains
        a number while the schema defines minimum and maximum values. The engine executing the workflow should handle invalid input,
        either by returning an error or clamping the value, depending on the graph.
      */
      if (isSingleVariable) {
        result.errors = removeErrorFromErrorsList({ errors: result.errors, propertyName, mode: 'exact' });
      }
    }

    if (Array.isArray(value) && value.length > 0) {
      const allArrayErrors = result.errors.filter((error) => error.instanceLocation.startsWith(`#/${propertyName}`));

      if (allArrayErrors.length > 0) {
        const isArrayOfStrings = value.every((item) => typeof item === 'string');

        // We can have values that are arrays of objects that require more development (also for control to show errors in the correct item)
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
    /* 
      We can create conditional validation using allOf, but the code above removes the detailed error messages,
      leaving only the errors related to the condition.
    */
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

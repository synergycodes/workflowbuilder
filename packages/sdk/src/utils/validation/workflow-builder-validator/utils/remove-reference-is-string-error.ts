import type { OutputUnit, ValidationResult } from '@cfworker/json-schema';

import { getIsStringVariableReference } from '../../../../features/variables/utils/keys/get-is-string-variable-reference';
import { getByPath } from '../../../object';
import { removeErrorFromErrorsList } from './remove-property-error-from-error-list';

type Params = {
  result: ValidationResult;
  // From form;
  data: unknown;
};

/** `#/to` and `#/to/...`, never `#/total`. */
const getIsLocatedUnder = (error: OutputUnit, propertyName: string): boolean =>
  error.instanceLocation === `#/${propertyName}` || error.instanceLocation.startsWith(`#/${propertyName}/`);

/** Index of the failing item for `#/<property>/<index>...`; the name is matched as text, so no regex escaping is needed. */
const getArrayItemIndex = (error: OutputUnit, propertyName: string): number | undefined => {
  const prefix = `#/${propertyName}/`;

  if (!error.instanceLocation.startsWith(prefix)) {
    return undefined;
  }

  const index = Number(error.instanceLocation.slice(prefix.length).split('/')[0]);

  return Number.isInteger(index) ? index : undefined;
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
      const allArrayErrors = result.errors.filter((error) => getIsLocatedUnder(error, propertyName));

      if (allArrayErrors.length > 0) {
        const isArrayOfStrings = value.every((item) => typeof item === 'string');

        // Arrays of objects stay untouched: the control cannot yet map an error to its item.
        if (isArrayOfStrings) {
          const failingIndexes = allArrayErrors
            .map((error) => getArrayItemIndex(error, propertyName))
            .filter((index): index is number => index !== undefined);

          if (failingIndexes.length > 0) {
            const areAllErrorValuesSingleVariable = failingIndexes.every((index) =>
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
      const allObjectErrors = result.errors.filter((error) => getIsLocatedUnder(error, propertyName));

      if (allObjectErrors.length > 0) {
        // Every keyword judging the value itself (type, format, pattern, enum...) is the engine's to judge
        // once the value is a reference; a missing nested property (`required`) is not.
        const areAllErrorValuesSingleVariable = allObjectErrors.every((error) => {
          const isErrorAboutPropertiesInNestedObject = error.keyword === 'properties';
          if (isErrorAboutPropertiesInNestedObject) {
            return true;
          }

          const objectPath = error.instanceLocation.slice(`#/${propertyName}/`.length).replaceAll('/', '.');

          if (!objectPath || error.instanceLocation === `#/${propertyName}`) {
            return false;
          }
          const propertyValue = getByPath(value, objectPath);

          return typeof propertyValue === 'string' && getIsStringVariableReference(propertyValue);
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

import type { ValidationResult, Validator } from '@cfworker/json-schema';

import { isPlainObject } from '../../../object';
import { removeReferenceIsStringErrors } from './remove-reference-is-string-error';

type Params = {
  standardValidator: Validator;
  validationCustomTypes?: (data: unknown) => ValidationResult;
  /** Top-level properties whose `type` lists `null`. */
  nullableProperties?: ReadonlySet<string>;
};

const isBlank = (value: unknown) => typeof value === 'string' && value.trim() === '';

// The standard validator takes '' as a present string. Here blank text is no value: dropped so
// `required` fires (and `format` never sees it), or `null` where the top-level schema says so explicitly.
// Nested objects are walked too; arrays are left as they are, their items are the controls' to shape.
function dropBlankText(value: unknown, nullableProperties?: ReadonlySet<string>): unknown {
  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => {
      if (isBlank(entry)) {
        return nullableProperties?.has(key) ? [[key, null]] : [];
      }

      return [[key, isPlainObject(entry) ? dropBlankText(entry) : entry]];
    }),
  );
}

/**
 * Builds a Validator-like object that runs the standard @cfworker validator together with
 * our custom-types validator (`date` / `datetime` / `time`) and strips variable-reference false positives.
 */
export function combineValidators({ standardValidator, validationCustomTypes, nullableProperties }: Params): Validator {
  return {
    validate: (data: unknown) => {
      // jsonforms passes the whole form here, but its rule engine also passes a single field value.
      const formattedData = dropBlankText(data, nullableProperties);
      const standardResult = standardValidator.validate(formattedData);
      let result = standardResult;

      if (validationCustomTypes) {
        const customResult = validationCustomTypes(formattedData);

        result = {
          valid: result.valid && customResult.valid,
          errors: [...result.errors, ...customResult.errors],
        };
      }

      result = removeReferenceIsStringErrors({
        data,
        result,
      });

      return result;
    },
  } as Validator;
}

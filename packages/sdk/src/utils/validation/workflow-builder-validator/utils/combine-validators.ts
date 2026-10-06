import type { ValidationResult, Validator } from '@cfworker/json-schema';

import { removeReferenceIsStringErrors } from './remove-reference-is-string-error';

type Params = {
  standardValidator: Validator;
  validationCustomTypes?: (data: unknown) => ValidationResult;
  /** Top-level properties whose `type` lists `null`. */
  nullableProperties?: ReadonlySet<string>;
};

const isBlank = (value: unknown) => typeof value === 'string' && value.trim() === '';

/**
 * Builds a Validator-like object that runs the standard @cfworker validator together with
 * our custom-types validator (`date` / `datetime`) and strips variable-reference false positives.
 */
export function combineValidators({ standardValidator, validationCustomTypes, nullableProperties }: Params): Validator {
  return {
    validate: (data: unknown) => {
      // JSONForm calls it with data for enter form byt sometimes also to check one field (ex. rules validation)
      const formattedData =
        typeof data === 'object'
          ? Object.fromEntries(
              Object.entries(data || {}).flatMap(([key, value]) => {
                if (!isBlank(value)) {
                  return [[key, value]];
                }
                // The standard validator takes '' as a present string. Here blank text is no value: dropped so
                // `required` fires, or `null` where the schema says so explicitly.
                return nullableProperties?.has(key) ? [[key, null]] : [];
              }),
            )
          : data;
      const standardResult = standardValidator.validate(formattedData);
      let result = standardResult;

      /*
        We support type 'date' 'datetime' in our custom schema, but the default validator does not.
        So we run a second validation for those types and combine the results.
      */
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

import type { ValidationResult, Validator } from '@cfworker/json-schema';

import { removeReferenceIsStringErrors } from './remove-reference-is-string-error';

type Params = {
  standardValidator: Validator;
  validationCustomTypes?: (data: unknown) => ValidationResult;
};

/**
 * Builds a Validator-like object that runs the standard @cfworker validator together with
 * our custom-types validator (`date` / `datetime`) and strips variable-reference false positives.
 */
export function combineValidators({ standardValidator, validationCustomTypes }: Params): Validator {
  return {
    validate: (data: unknown) => {
      // JSONForm calls it with data for enter form byt sometimes also to check one field (ex. rules validation)
      const formattedData =
        typeof data === 'object'
          ? Object.fromEntries(
              // Default schema accepts '' string as valid for required this, clears those values and prompts required.
              Object.entries(data || {}).filter(([, value]) => !(typeof value === 'string' && value.trim() === '')),
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

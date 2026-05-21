/**
 * CSP-safe replacement for Ajv.
 *
 * Ajv v8 uses `new Function()` internally in `ajv.compile()`, which is blocked
 * by Content Security Policy headers that don't include `unsafe-eval`.
 *
 * This module provides a duck-typed Ajv-compatible wrapper that uses
 * `@cfworker/json-schema` — an interpreter-based JSON Schema validator
 * that never uses `eval` or `new Function()`.
 *
 * The wrapper implements two methods used by jsonforms and our own code:
 * - `compile(schema)` — returns a ValidateFunction (used by jsonforms reducer and get-node-errors.ts)
 * - `validate(schema, data)` — shorthand for compile + run (used by jsonforms rule engine in runtime.ts)
 */
import type { OutputUnit, Schema } from '@cfworker/json-schema';
import { Validator } from '@cfworker/json-schema';
import type Ajv from 'ajv';
import type { ErrorObject } from 'ajv';

/**
 * Matches Ajv's ValidateFunction interface:
 * a callable that returns boolean and exposes `.errors` after each call.
 */
type ValidateFunction = {
  (data: unknown): boolean;
  errors: ErrorObject[] | null;
};

/**
 * Duck-typed Ajv interface — only the methods actually called by jsonforms and our code.
 */
type AjvLike = {
  compile: (schema: object) => ValidateFunction;
  validate: (schema: object, data: unknown) => boolean;
};

/**
 * Extracts the missing property name from @cfworker/json-schema's `required` error message.
 * Example: `'Instance does not have required property "description".'` → `"description"`
 *
 * This is critical because jsonforms' `useHasChildError` hook reads
 * `error.params['missingProperty']` to build error paths for form field highlighting.
 */
const REQUIRED_PROPERTY_REGEX = /required property "(.+)"/;

/**
 * Maps @cfworker/json-schema OutputUnit[] to Ajv-compatible ErrorObject[].
 *
 * Key differences between the two formats:
 * - instanceLocation uses '#' prefix (e.g. "#/duration") → instancePath without it (e.g. "/duration")
 * - Root location is "#" in cfworker → "" in Ajv
 * - cfworker has no `params` object → we construct it (needed for `required` errors)
 */
function mapOutputToErrorObjects(errors: OutputUnit[]): ErrorObject[] {
  return errors.map((output) => {
    // Strip '#' prefix: "#/duration/delayAmount" → "/duration/delayAmount", "#" → ""
    const instancePath = output.instanceLocation === '#' ? '' : output.instanceLocation.slice(1);
    const params: Record<string, unknown> = {};

    if (output.keyword === 'required') {
      const match = output.error.match(REQUIRED_PROPERTY_REGEX);
      if (match) {
        params.missingProperty = match[1];
      }
    }

    // NOTE: If schemas start using `dependencies` or `additionalProperties` keywords,
    // their `params` must also be mapped here. jsonforms' `getControlPath` (errors.ts) reads:
    // - `params.missingProperty` for `required` and `dependencies` keywords
    // - `params.additionalProperty` for `additionalProperties` keyword
    // Without these, errors won't be associated with the correct form field.

    return {
      keyword: output.keyword,
      instancePath,
      schemaPath: output.keywordLocation,
      message: output.error,
      params,
    };
  });
}

/**
 * Creates a function matching Ajv's ValidateFunction interface,
 * backed by @cfworker/json-schema's interpreter-based Validator.
 *
 * - draft '7' — JSON Schema draft-07 (matches jsonforms' default)
 * - shortCircuit=false — collect all errors, equivalent to Ajv's `allErrors: true`
 */
function createValidateFunction(schema: object): ValidateFunction {
  const validator = new Validator(schema as Schema, '7', false);

  const validateFn = (data: unknown): boolean => {
    const result = validator.validate(data);
    validateFn.errors = result.valid ? null : mapOutputToErrorObjects(result.errors);
    return result.valid;
  };

  validateFn.errors = null as ErrorObject[] | null;

  return validateFn;
}

function createWorkflowBuilderValidator(): AjvLike {
  // Cache validators by schema object reference to avoid recreating them on every call.
  // WeakMap allows garbage collection when schema objects are no longer referenced.
  const cache = new WeakMap<object, ValidateFunction>();

  return {
    /**
     * Equivalent to Ajv's `ajv.compile(schema)`.
     * Used by: jsonforms core reducer, jsonforms combinator renderer, get-node-errors.ts
     */
    compile(schema: object): ValidateFunction {
      let validateFn = cache.get(schema);
      if (!validateFn) {
        validateFn = createValidateFunction(schema);
        cache.set(schema, validateFn);
      }
      return validateFn;
    },

    /**
     * Equivalent to Ajv's `ajv.validate(schema, data)` — compiles and validates in one step.
     * Used by: jsonforms rule engine (runtime.ts) for UI schema conditions (show/hide/enable/disable).
     *
     * Guards against `undefined` data because @cfworker/json-schema throws
     * "Instances of undefined type are not supported", while Ajv returns false.
     */
    validate(schema: object, data: unknown): boolean {
      if (data === undefined) {
        return false;
      }
      const validateFn = this.compile(schema);
      return validateFn(data);
    },
  };
}

/**
 * Exported as `Ajv` type so consumers (e.g. jsonforms' `ajv` prop) don't need type casts.
 * The cast is safe because we implement the only two methods jsonforms calls: `compile()` and `validate()`.
 */
export const workflowBuilderValidator = createWorkflowBuilderValidator() as unknown as Ajv;

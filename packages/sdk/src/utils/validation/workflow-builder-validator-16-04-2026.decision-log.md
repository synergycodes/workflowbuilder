### Title: CSP-safe Ajv replacement with @cfworker/json-schema

### Proposed by: Piotr Błaszczyk

### Date: 16.04.2026

## Context

Ajv v8 uses `new Function()` internally when calling `ajv.compile(schema)` to generate optimized validator functions at runtime. This approach is blocked by strict Content Security Policy (CSP) headers that don't include `unsafe-eval` in `script-src`.

The project uses Ajv in two places:

1. **Directly** - `get-node-errors.ts` creates `new Ajv()` and calls `ajv.compile(schema)` to validate node properties against JSON Schema.
2. **Indirectly via jsonforms** - `@jsonforms/core` internally calls `ajv.compile(schema)` in its reducer and `ajv.validate(schema, data)` in its rule engine (`runtime.ts`) for UI schema conditions (show/hide/enable/disable).

Schemas are loaded **dynamically from the backend**, so build-time pre-compilation (e.g. `ajv/dist/standalone`) is not feasible.

## Decision

Replace Ajv's runtime code generation with `@cfworker/json-schema` - an interpreter-based JSON Schema validator that never uses `eval` or `new Function()`. It was built for Cloudflare Workers (which prohibit eval) and passes the official JSON Schema test suite for drafts 4, 7, 2019-09, and 2020-12.

### Implementation: Duck-typed Ajv wrapper

Rather than switching jsonforms to `NoValidation` mode or forking the library, we created a **duck-typed wrapper** (`workflow-builder-validator.ts`) that looks like an Ajv instance to jsonforms but delegates to `@cfworker/json-schema` internally.

The wrapper implements two methods - the only ones jsonforms calls:

- **`compile(schema)`** - creates a `@cfworker/json-schema` Validator and returns a function matching Ajv's `ValidateFunction` interface (`(data) => boolean` with `.errors` property). Errors are mapped from `OutputUnit` to `ErrorObject` format.
- **`validate(schema, data)`** - shorthand for `compile(schema)(data)`. Guards against `undefined` data (`@cfworker/json-schema` throws, Ajv returns `false`).

### Error format mapping

`@cfworker/json-schema` returns `OutputUnit` objects that differ from Ajv's `ErrorObject`:

| Mapping     | `@cfworker/json-schema`          | Ajv                                  |
| ----------- | -------------------------------- | ------------------------------------ |
| Path        | `instanceLocation: "#/duration"` | `instancePath: "/duration"`          |
| Root path   | `"#"`                            | `""`                                 |
| Schema path | `keywordLocation`                | `schemaPath`                         |
| Message     | `error`                          | `message`                            |
| Params      | not present                      | `params: { missingProperty: "..." }` |

The `params.missingProperty` field is **critical** - jsonforms' `useHasChildError` hook and `getControlPath` function read it to associate `required` errors with the correct form field. We extract it via regex from the error message: `/required property "(.+)"/`.

### Caching

Validators are cached in a `WeakMap<object, ValidateFunction>` keyed by schema object reference. This avoids recreating `Validator` instances on every render cycle while allowing garbage collection.

### Typing

The wrapper is exported as `Ajv` type (`as unknown as Ajv`) so consumers (e.g. jsonforms' `ajv` prop) don't need type casts. The cast is contained in one place with a clear comment.

## Rejected Alternatives

### 1. Build-time pre-compilation with `ajv/dist/standalone`

Ajv supports generating standalone validator modules at build time that don't use `new Function()` at runtime. This would work for static schemas but **not for this project** - schemas are loaded dynamically from the backend and are not known at build time.

### 2. Set jsonforms to `NoValidation` mode + validate externally

Setting `validationMode="NoValidation"` prevents jsonforms from calling `ajv.compile()`. Validation could be done externally with `@cfworker/json-schema` and errors fed back via the `additionalErrors` prop.

**Rejected because:** The `useHasChildError` hook reads `core.errors` from jsonforms context. With `NoValidation`, `core.errors` is always empty, breaking error highlighting on horizontal layout sections. Fixing this would require modifying the hook and changing the validation flow in `node-properties.tsx`.

### 3. Add `unsafe-eval` to CSP

The simplest change - allow `eval` in CSP. **Rejected because** it defeats the purpose of strict CSP and would not pass security audits.

## Consequences

### Pros

- **CSP-compliant** - zero `unsafe-eval` violations from validation code (verified with `Content-Security-Policy-Report-Only` header)
- **Minimal surface area** - only 4 files changed + 1 new file. All downstream consumers untouched.
- **Transparent to jsonforms** - validation flow, `core.errors`, `useHasChildError`, `onChange` errors all work identically.
- **Performance improvement** - the old code created `new Ajv()` on every `getNodeErrors()` call. The wrapper caches validators via `WeakMap`.

### Cons

- **Error messages differ** - e.g. `"must have required property 'X'"` (Ajv) vs `'Instance does not have required property "X".'` (`@cfworker/json-schema`). If messages are user-facing, they may need normalization.
- **`params` mapping is partial** - only `required` → `missingProperty` is mapped. If schemas use `dependencies` or `additionalProperties` keywords, their `params` must also be extracted (see comment in `workflow-builder-validator.ts`). Currently no schemas in this project use those keywords.
- **Regex fragility** - the `missingProperty` extraction depends on `@cfworker/json-schema`'s error message wording. Mitigated by: pinning the exact version (`4.1.1`, no `^`) and a canary test that fails if the message format changes.
- **Interpreter performance** - `@cfworker/json-schema` interprets schemas at runtime (no code generation), which is slower than Ajv's compiled validators. Negligible for the small schemas in this project, but worth benchmarking on larger schemas.

## Future Considerations

- If `@cfworker/json-schema` is upgraded, run the canary test (`workflowBuilderValidator > should populate params.missingProperty for required errors`) to verify the error message format hasn't changed.
- If new schemas use `dependencies` or `additionalProperties: false`, extend `mapOutputToErrorObjects` in `workflow-builder-validator.ts` to map their `params`.
- The `javascript-obfuscator` plugin (used in production with `HEAVY` config) uses `selfDefending: true` which also generates `new Function()` calls. This is a separate CSP issue unrelated to validation.

## Status

Accepted

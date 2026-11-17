### Title: Variable references and date types in form validation

### Proposed by: Szymon Tondowski

### Date: 02.10.2026 (recorded 26.10.2026)

## Context

Node forms validate `properties` through the CSP-safe wrapper in `workflow-builder-validator.ts` (see `workflow-builder-validator-16-04-2026.decision-log.md`). Two things in node schemas are not plain JSON Schema data:

- A property can hold a variable reference such as `{{global.email}}` or `{{nodes.writer-1.count}}`. In the form it is a string; at run time the engine replaces it with the referenced value (`packages/execution-core/src/templates/resolve-template.ts`). A `number` property holding `{{nodes.x.count}}` failed `type`, an `email` property holding `{{global.email}}` failed `format`, so every reference showed as an error the author could not fix.
- Schemas declare `date` and `datetime` property types for the date pickers. Neither is a JSON Schema type: `@cfworker/json-schema` fails every value of such a property with a `type` error (verified 26.10.2026).

Both are decided here. The blank-text rule (blank text is a missing value, or `null` where the schema allows it) is a third deviation from standard validation; it lives in `utils/combine-validators.ts` and is listed in `features/json-form/form-validation.decision-log.md`.

## Decision

### 1. A whole-string variable reference is not the form's to judge

The form cannot know the value a reference resolves to, so it does not validate it. The standard validator runs on the raw value, then `utils/remove-reference-is-string-error.ts` strips the errors it produced for references. The engine judges the resolved value at run time.

What counts as a reference (`getIsStringVariableReference`): the trimmed value is exactly one `{{...}}` block, with no space inside and a known namespace prefix (`global.`, `trigger.`, `nodes.`, `variables.`). `hi {{global.email}}`, `{{a}} {{b}}` and `{{foo.x}}` are plain text and stay validated as such.

Scope, by the shape of the top-level property value:

- string: errors naming the property (by `instanceLocation`, `keywordLocation` or the message text) are dropped.
- array of strings: dropped only when every failing item is a reference; one plain invalid item keeps all of the array's errors. Arrays of objects are left untouched, the control cannot yet map an error to its item.
- object: every error about a nested value (`type`, `format`, `pattern`, `enum`, ...) plus the `properties` wrapper errors are dropped, and only when every failing nested value is a reference. A missing nested property (`required`) is kept: a reference elsewhere says nothing about it.
- once the detailed errors are gone, `allOf` / `if` wrapper errors are dropped too; a result with no errors left becomes valid.

Known limits:

- Removal is keyed by the top-level property name (`removeErrorFromErrorsList` has no path support), so for arrays and objects it is all or nothing.
- Matching by message text (`"<name>"`) is limited to the `properties` and `required` keywords, whose messages are the only place the property name appears; a `format` message quotes the format name (`"email"`), which must not be read as a property.
- jsonforms' rule engine passes a single field value, not the form object; non-object data is returned untouched.

### 2. `date` and `datetime` are not JSON Schema types; they are checked separately

`workflow-builder-validator.ts` splits every property whose `type` is `date` or `datetime` out of the schema before `@cfworker/json-schema` sees it, so the standard validator never fails them. `required` stays in the standard schema, so a missing required date still fails there. The split-out properties go to `workflow-builder-validator-for-custom-types.ts`, whose contract is: a value passes as a string that `getIsValidDate` parses (`new Date(value)` is a real date) or as a single variable reference per § 1.

`time` (02.11.2026) joins the split under the same contract; its value passes when `getTimeHHmm` reads a clock from it (the input saves `HH:mm:00+00:00`, a bare `HH:mm` passes too), since `new Date('09:07')` is invalid.

Why these values carry no zone, and what each stored shape means: `utils/time-iso.decision-log.md`.

Closed 17.11.2026: until then the custom check reported nothing (it iterated `schema.properties` of a properties map, never an array, and returned a constant `{ valid: false, errors: [] }` that the reference stripping flipped back to valid). It now takes the split-out properties map, checks every present value per call and reports `type` errors at `#/<name>`; a missing key stays the standard schema's `required` to report. Covered by `workflow-builder-validator.spec.ts`.

## Alternative Options Considered

- Resolve references in the form and validate the result. Not possible: the value exists only at run time, after the engine resolves the reference against node outputs and the trigger payload.
- Leave `date` / `datetime` in the schema the standard validator sees. Every value of such a property fails `type` (verified 26.10.2026), so the split is required, not optional.

## Consequences

- The form's verdict is looser than a standard JSON Schema validator's on exactly these cases; `form-validation.decision-log.md` carries a superseded-in-part note for its "standard AJV" claim.
- `VARIABLE_REFERENCE_KEYS` in `features/variables/constants.ts` and the `VariableReference` union in `@workflow-builder/types/variables` must stay in sync, or a new namespace is validated as plain text.
- The blank-text rule walks nested objects too, so a nested `''` never reaches a `format` check; arrays are left to their controls.

## Status

Accepted.

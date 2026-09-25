import { editableFields } from '../editor-form/editor-layout';
import { schemaFields } from '../editor-form/form-schema';
import { isPlainObject } from '../is-plain-object';

/** The proposal's values for the fields the form declares. A hidden field is not declared, so it is not here. */
export function proposedValues(proposal: unknown, schema: unknown): Record<string, unknown> {
  const source = isPlainObject(proposal) ? proposal : {};
  return Object.fromEntries(
    schemaFields(schema)
      .filter(([key]) => Object.hasOwn(source, key))
      .map(([key]) => [key, source[key]]),
  );
}

/** Where the form starts: the draft, except that a field the person cannot change shows the proposal. */
export function startingValues(
  proposed: Record<string, unknown>,
  draft: Record<string, unknown> | undefined,
  schema: unknown,
): Record<string, unknown> {
  if (draft === undefined) {
    return proposed;
  }
  // A draft can outlive its schema: undo takes a pick back under an open decision when the canvas lock is lifted.
  const editable = editableFields(schema);
  const values = { ...draft };
  for (const [key] of schemaFields(schema).filter(([name]) => !editable.has(name))) {
    // The editor's validator throws on a key that holds `undefined`, so a value the proposal lacks is left out.
    if (Object.hasOwn(proposed, key)) {
      values[key] = proposed[key];
    } else {
      delete values[key];
    }
  }
  return values;
}

// An emptied field travels as null, or as '' from a text area; the backend reads both as emptied, and a dropped key
// would keep the old value.
export function editsOf(
  proposed: Record<string, unknown>,
  current: Record<string, unknown>,
  schema: unknown,
): Record<string, unknown> {
  const edits: Record<string, unknown> = {};
  for (const key of editableFields(schema)) {
    if (!Object.is(current[key], proposed[key])) {
      edits[key] = current[key] === undefined ? null : current[key];
    }
  }
  return edits;
}

// Only a fault the person can correct holds the decision back. The backend checks presence and editability, not values.
export function blocksApproval(invalidFields: ReadonlySet<string>, schema: unknown): boolean {
  const editable = editableFields(schema);
  return [...invalidFields].some((field) => editable.has(field));
}

/** The values a decision settled: the proposal with the edits applied, an emptied field left without a value. */
export function withEdits(proposed: Record<string, unknown>, edits: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries({ ...proposed, ...edits }).filter(([, value]) => value !== null));
}

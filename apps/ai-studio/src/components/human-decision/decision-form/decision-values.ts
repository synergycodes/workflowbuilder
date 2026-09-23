import { isPlainObject } from '../../../utils/is-plain-object';
import { schemaFields } from '../../editor-form/form-schema';

/** The proposal's values for the fields the form declares. A hidden field is not declared, so it is not here. */
export function proposedValues(proposal: unknown, schema: unknown): Record<string, unknown> {
  const source = isPlainObject(proposal) ? proposal : {};
  return Object.fromEntries(
    schemaFields(schema)
      .filter(([key]) => Object.hasOwn(source, key))
      .map(([key]) => [key, source[key]]),
  );
}

// An emptied field travels as null: the backend reads null as "emptied", and a dropped key would keep the old value.
export function editsOf(
  proposed: Record<string, unknown>,
  current: Record<string, unknown>,
  schema: unknown,
): Record<string, unknown> {
  const edits: Record<string, unknown> = {};
  for (const [key, field] of schemaFields(schema)) {
    if (field['readOnly'] === true || Object.is(current[key], proposed[key])) {
      continue;
    }
    edits[key] = current[key] === undefined ? null : current[key];
  }
  return edits;
}

/** The values a decision settled: the proposal with the edits applied, an emptied field left without a value. */
export function withEdits(proposed: Record<string, unknown>, edits: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries({ ...proposed, ...edits }).filter(([, value]) => value !== null));
}

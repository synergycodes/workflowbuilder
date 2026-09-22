import { isPlainObject } from '../../../utils/is-plain-object';
import { type DecisionField, type DecisionFieldKind, isEditable } from './decision-fields';

/**
 * What the form holds per field: the text in the box for a number or a text field, the state of
 * the switch for a boolean, the value as it arrived for a field the form only displays.
 */
export type DecisionValues = Record<string, unknown>;

// The proposal is whatever the source node produced, so a number may arrive as a string. The box
// shows the text either way; the declared type is honoured when the decision is sent.
function asBoxText(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

const TO_INPUT = {
  number: asBoxText,
  text: asBoxText,
  boolean: (value: unknown) => value === true,
  unsupported: (value: unknown) => value,
} satisfies Record<DecisionFieldKind, (value: unknown) => unknown>;

function typedText(input: unknown): string | undefined {
  return typeof input === 'string' && input.trim().length > 0 ? input : undefined;
}

const TO_SUBMITTED = {
  number: (input: unknown) => {
    const text = typedText(input);
    const parsed = text === undefined ? Number.NaN : Number(text);
    return Number.isFinite(parsed) ? parsed : undefined;
  },
  text: typedText,
  boolean: (input: unknown) => input === true,
  // Never reached: `editsOf` skips a field that is not editable. Here so a new kind must decide.
  unsupported: (): undefined => {
    return undefined;
  },
} satisfies Record<DecisionFieldKind, (input: unknown) => unknown>;

export function initialValues(proposal: unknown, fields: DecisionField[]): DecisionValues {
  const source = isPlainObject(proposal) ? proposal : {};
  return Object.fromEntries(fields.map((field) => [field.key, TO_INPUT[field.kind](source[field.key])]));
}

// An emptied field travels as null: the backend reads null as "emptied", and a dropped key would keep the old value.
export function editsOf(
  initial: DecisionValues,
  current: DecisionValues,
  fields: DecisionField[],
): Record<string, unknown> {
  const edits: Record<string, unknown> = {};
  for (const field of fields) {
    if (!isEditable(field)) {
      continue;
    }
    const value = TO_SUBMITTED[field.kind](current[field.key]);
    if (Object.is(value, TO_SUBMITTED[field.kind](initial[field.key]))) {
      continue;
    }
    edits[field.key] = value === undefined ? null : value;
  }
  return edits;
}
